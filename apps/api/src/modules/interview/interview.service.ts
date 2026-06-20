import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { TimelineService } from '../timeline/timeline.service';
import {
  CandidateStatus,
  TimelineEventType,
  interviewerNameSchema,
  interviewNotesSchema,
  feedbackSchema,
} from '@rove-hire/shared';
import { ScheduleInterviewInput } from './dto/schedule-interview.input';
import { RecordFeedbackInput } from './dto/record-feedback.input';
import { InterviewFiltersInput } from './dto/interview-filters.input';
import type { Interview } from '../../generated/prisma';

/**
 * InterviewService handles scheduling interviews, recording feedback,
 * and querying interview records.
 *
 * Scheduling rules:
 * - Date must be in the future
 * - Interviewer name 1-100 chars, notes max 1000
 * - If candidate is FormSubmitted → transition to InterviewScheduled
 * - If candidate is already InterviewScheduled → keep status unchanged
 * - Reject if candidate is in terminal status (Hired/Rejected)
 *
 * Feedback rules:
 * - Recommendation: Hire/NoHire/Maybe
 * - Feedback text: 1-2000 chars
 * - Marks interview as Completed with completedAt timestamp
 *
 * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8, 6.9
 */
@Injectable()
export class InterviewService {
  private readonly logger = new Logger(InterviewService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly timelineService: TimelineService,
  ) {}

  /**
   * Schedule a new interview for a candidate.
   *
   * Validates:
   * - scheduledAt is in the future
   * - interviewerName 1-100 chars
   * - notes max 1000 chars (if provided)
   * - Candidate is not in a terminal status (Hired/Rejected)
   *
   * Side effects:
   * - If candidate status is FormSubmitted → transitions to InterviewScheduled
   * - If candidate status is InterviewScheduled → status remains unchanged
   * - Logs an interview_scheduled timeline event
   *
   * Requirements: 6.1, 6.2, 6.3, 6.6, 6.7, 6.8
   */
  async schedule(input: ScheduleInterviewInput): Promise<Interview> {
    // Validate interviewer name
    const nameResult = interviewerNameSchema.safeParse(input.interviewerName);
    if (!nameResult.success) {
      throw new BadRequestException(
        nameResult.error.issues.map((i) => i.message).join('; '),
      );
    }

    // Validate notes (if provided)
    if (input.notes !== undefined && input.notes !== null) {
      const notesResult = interviewNotesSchema.safeParse(input.notes);
      if (!notesResult.success) {
        throw new BadRequestException(
          notesResult.error.issues.map((i) => i.message).join('; '),
        );
      }
    }

    // Validate scheduled date is in the future
    const scheduledAt = new Date(input.scheduledAt);
    if (isNaN(scheduledAt.getTime())) {
      throw new BadRequestException('Scheduled date must be a valid date');
    }
    if (scheduledAt <= new Date()) {
      throw new BadRequestException('Interview date must be in the future');
    }

    // Fetch candidate to check status
    const candidate = await this.prisma.candidate.findUnique({
      where: { id: input.candidateId },
    });

    if (!candidate) {
      throw new NotFoundException(
        `Candidate with ID "${input.candidateId}" not found`,
      );
    }

    // Reject scheduling for terminal statuses (Hired/Rejected)
    const terminalStatuses: string[] = [
      CandidateStatus.Hired,
      CandidateStatus.Rejected,
    ];
    if (terminalStatuses.includes(candidate.status)) {
      throw new BadRequestException(
        `Cannot schedule interviews for candidates in ${candidate.status} status`,
      );
    }

    // Create interview record
    const interview = await this.prisma.interview.create({
      data: {
        candidateId: input.candidateId,
        type: input.type,
        scheduledAt,
        interviewerName: input.interviewerName,
        notes: input.notes ?? null,
        status: 'Scheduled',
      },
      include: { candidate: { select: { id: true, name: true } } },
    });

    // Transition candidate status if currently FormSubmitted
    if (candidate.status === CandidateStatus.FormSubmitted) {
      await this.prisma.candidate.update({
        where: { id: input.candidateId },
        data: {
          status: CandidateStatus.InterviewScheduled,
          lastActivityAt: new Date(),
        },
      });

      this.logger.log(
        `Candidate ${input.candidateId} status transitioned: FormSubmitted → InterviewScheduled`,
      );
    } else {
      // Update lastActivityAt even if status doesn't change
      await this.prisma.candidate.update({
        where: { id: input.candidateId },
        data: { lastActivityAt: new Date() },
      });
    }

    // Log timeline event for scheduling
    await this.timelineService.logEvent({
      candidateId: input.candidateId,
      eventType: TimelineEventType.InterviewScheduled,
      previousStatus: candidate.status,
      newStatus:
        candidate.status === CandidateStatus.FormSubmitted
          ? CandidateStatus.InterviewScheduled
          : candidate.status,
      details: `Interview scheduled: ${input.type} with ${input.interviewerName} on ${scheduledAt.toISOString()}`,
    });

    this.logger.log(
      `Interview scheduled: id=${interview.id}, candidate=${input.candidateId}, type=${input.type}`,
    );

    return interview;
  }

  /**
   * Record feedback for a completed interview.
   *
   * Validates:
   * - Interview exists and is in Scheduled status
   * - Recommendation is valid (Hire/NoHire/Maybe)
   * - Feedback text is 1-2000 chars
   *
   * Side effects:
   * - Sets interview status to Completed, stores recommendation, feedback, and completedAt
   * - Logs a feedback_submitted timeline event
   *
   * Requirements: 6.4, 6.5
   */
  async recordFeedback(input: RecordFeedbackInput): Promise<Interview> {
    // Validate feedback text
    const feedbackResult = feedbackSchema.safeParse(input.feedback);
    if (!feedbackResult.success) {
      throw new BadRequestException(
        feedbackResult.error.issues.map((i) => i.message).join('; '),
      );
    }

    // Fetch interview
    const interview = await this.prisma.interview.findUnique({
      where: { id: input.interviewId },
    });

    if (!interview) {
      throw new NotFoundException(
        `Interview with ID "${input.interviewId}" not found`,
      );
    }

    if (interview.status !== 'Scheduled') {
      throw new BadRequestException(
        `Cannot record feedback for an interview with status "${interview.status}". Only scheduled interviews can receive feedback.`,
      );
    }

    // Update interview with feedback
    const now = new Date();
    const updatedInterview = await this.prisma.interview.update({
      where: { id: input.interviewId },
      data: {
        recommendation: input.recommendation,
        feedback: input.feedback,
        status: 'Completed',
        completedAt: now,
      },
      include: { candidate: { select: { id: true, name: true } } },
    });

    // Update candidate lastActivityAt
    await this.prisma.candidate.update({
      where: { id: interview.candidateId },
      data: { lastActivityAt: now },
    });

    // Log timeline event for feedback
    await this.timelineService.logEvent({
      candidateId: interview.candidateId,
      eventType: TimelineEventType.FeedbackSubmitted,
      details: `Interview feedback recorded: ${input.recommendation} — "${input.feedback.substring(0, 100)}${input.feedback.length > 100 ? '...' : ''}"`,
    });

    this.logger.log(
      `Feedback recorded: interview=${input.interviewId}, recommendation=${input.recommendation}`,
    );

    return updatedInterview;
  }

  /**
   * Query interviews with optional filters.
   * Always sorted by scheduledAt ascending.
   * Filterable by candidateId, type, and status.
   *
   * Requirements: 6.9
   */
  async findAll(filters?: InterviewFiltersInput): Promise<Interview[]> {
    const where: Record<string, unknown> = {};

    if (filters?.candidateId) {
      where.candidateId = filters.candidateId;
    }

    if (filters?.type) {
      where.type = filters.type;
    }

    if (filters?.status) {
      where.status = filters.status;
    }

    return this.prisma.interview.findMany({
      where,
      orderBy: { scheduledAt: 'asc' },
      include: { candidate: { select: { id: true, name: true } } },
    });
  }

  /**
   * Get a single interview by ID.
   */
  async findById(id: string): Promise<Interview> {
    const interview = await this.prisma.interview.findUnique({
      where: { id },
      include: { candidate: { select: { id: true, name: true } } },
    });

    if (!interview) {
      throw new NotFoundException(`Interview with ID "${id}" not found`);
    }

    return interview;
  }
}
