import { Resolver, Query, Mutation, Args } from '@nestjs/graphql';
import { InterviewService } from './interview.service';
import { InterviewObjectType } from './interview.model';
import { ScheduleInterviewInput } from './dto/schedule-interview.input';
import { RecordFeedbackInput } from './dto/record-feedback.input';
import { InterviewFiltersInput } from './dto/interview-filters.input';

/**
 * InterviewResolver exposes GraphQL queries and mutations for interviews.
 *
 * Queries:
 * - interviews(filters): List interviews with optional filters, sorted by date ascending
 *
 * Mutations:
 * - scheduleInterview(input): Schedule a new interview for a candidate
 * - recordFeedback(input): Record feedback for a completed interview
 *
 * All resolvers are protected by the global JwtAuthGuard (APP_GUARD).
 *
 * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8, 6.9
 */
@Resolver(() => InterviewObjectType)
export class InterviewResolver {
  constructor(private readonly interviewService: InterviewService) {}

  /**
   * Schedule a new interview for a candidate.
   * Validates date is in the future, interviewer name 1-100 chars, notes max 1000.
   * Transitions candidate status from FormSubmitted to InterviewScheduled.
   * Rejects scheduling for terminal statuses (Hired/Rejected).
   *
   * Requirements: 6.1, 6.2, 6.3, 6.6, 6.7, 6.8
   */
  @Mutation(() => InterviewObjectType, { description: 'Schedule a new interview for a candidate' })
  async scheduleInterview(
    @Args('input') input: ScheduleInterviewInput,
  ): Promise<InterviewObjectType> {
    const interview = await this.interviewService.schedule(input);
    return this.mapToGraphQL(interview);
  }

  /**
   * Record feedback for an interview.
   * Sets recommendation, feedback text, marks as Completed.
   *
   * Requirements: 6.4, 6.5
   */
  @Mutation(() => InterviewObjectType, { description: 'Record feedback for an interview' })
  async recordFeedback(
    @Args('input') input: RecordFeedbackInput,
  ): Promise<InterviewObjectType> {
    const interview = await this.interviewService.recordFeedback(input);
    return this.mapToGraphQL(interview);
  }

  /**
   * List interviews with optional filters.
   * Sorted by scheduledAt ascending. Filterable by candidateId, type, and status.
   *
   * Requirements: 6.9
   */
  @Query(() => [InterviewObjectType], { description: 'List interviews sorted by date ascending' })
  async interviews(
    @Args('filters', { nullable: true }) filters?: InterviewFiltersInput,
  ): Promise<InterviewObjectType[]> {
    const interviews = await this.interviewService.findAll(filters);
    return interviews.map((i) => this.mapToGraphQL(i));
  }

  /**
   * Map Prisma Interview to GraphQL object type.
   */
  private mapToGraphQL(interview: {
    id: string;
    candidateId: string;
    type: string;
    scheduledAt: Date;
    interviewerName: string;
    notes: string | null;
    status: string;
    recommendation: string | null;
    feedback: string | null;
    completedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
    candidate?: { id: string; name: string } | null;
  }): InterviewObjectType {
    return {
      id: interview.id,
      candidateId: interview.candidateId,
      candidate: interview.candidate ?? null,
      type: interview.type as InterviewObjectType['type'],
      scheduledAt: interview.scheduledAt,
      interviewerName: interview.interviewerName,
      notes: interview.notes,
      status: interview.status as InterviewObjectType['status'],
      recommendation: interview.recommendation as InterviewObjectType['recommendation'],
      feedback: interview.feedback,
      completedAt: interview.completedAt,
      createdAt: interview.createdAt,
      updatedAt: interview.updatedAt,
    };
  }
}
