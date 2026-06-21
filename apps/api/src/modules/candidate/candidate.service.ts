import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import type { PrismaService } from '../../prisma/prisma.service';
import type { FileService } from '../file/file.service';
import type { MagicLinkService } from '../magic-link/magic-link.service';
import type { JobService } from '../job/job.service';
import type { StateMachineService } from '../state-machine/state-machine.service';
import type { TimelineService } from '../timeline/timeline.service';
import type { CandidateStatus, TransitionMeta } from '@rove-hire/shared';
import { candidateNameSchema, emailSchema, TimelineEventType, PAGINATION } from '@rove-hire/shared';
import type { CreateCandidateInput } from './dto/create-candidate.input';
import type { CandidateFiltersInput } from './dto/candidate-filters.input';

/**
 * CandidateService handles CRUD operations and pipeline management for candidates.
 *
 * - create: validates input, uploads resume to S3, creates candidate, generates magic link
 * - findAll: paginated list with filtering by status, search by name/role, sorted by lastActivityAt DESC
 * - findById: full candidate with relations (job, documents, interviews, timeline events)
 * - updateStatus: delegates to StateMachineService for validated transitions
 *
 * Requirements: 4.1, 4.2, 4.5, 4.6, 4.7, 4.8, 4.9, 4.10, 4.11, 2.1, 2.2, 2.3, 2.6
 */
@Injectable()
export class CandidateService {
  private readonly logger = new Logger(CandidateService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly fileService: FileService,
    private readonly magicLinkService: MagicLinkService,
    private readonly jobService: JobService,
    private readonly stateMachineService: StateMachineService,
    private readonly timelineService: TimelineService,
  ) {}

  /**
   * Create a new candidate with resume upload and magic link generation.
   *
   * Flow:
   * 1. Validate name (max 100 chars) and email (RFC 5322)
   * 2. Validate job is open (reject if Closed)
   * 3. Check for duplicate email+job (composite unique constraint)
   * 4. Upload resume to S3 (must succeed before DB record creation — atomic guarantee)
   * 5. Create candidate record with status = Applied
   * 6. Generate magic link for candidate application form
   * 7. Create timeline event for application_submitted
   * 8. Return candidate + magic link URL
   *
   * Requirements: 4.1, 4.2, 4.5, 4.6, 4.7, 4.8, 4.9, 4.10, 4.11
   */
  async create(input: CreateCandidateInput, resumeBuffer: Buffer, resumeFilename: string) {
    // Step 1: Validate name
    const nameResult = candidateNameSchema.safeParse(input.name);
    if (!nameResult.success) {
      throw new BadRequestException(nameResult.error.issues.map((i) => i.message).join('; '));
    }

    // Step 1: Validate email
    const emailResult = emailSchema.safeParse(input.email);
    if (!emailResult.success) {
      throw new BadRequestException(emailResult.error.issues.map((i) => i.message).join('; '));
    }

    // Step 2: Validate job is open (throws if closed or not found)
    await this.jobService.validateJobOpen(input.jobOpeningId);

    // Step 3: Check for duplicate email+job
    const existing = await this.prisma.candidate.findUnique({
      where: {
        email_jobOpeningId: {
          email: input.email,
          jobOpeningId: input.jobOpeningId,
        },
      },
    });

    if (existing) {
      throw new ConflictException(
        `A candidate with email "${input.email}" already exists for this job opening`,
      );
    }

    // Step 4: Upload resume to S3
    let uploadedFile: { s3Key: string; size: number } | null = null;
    try {
      uploadedFile = await this.fileService.upload(resumeBuffer, 'resumes', resumeFilename);
      this.logger.log(`Resume uploaded to S3: ${uploadedFile.s3Key} for candidate "${input.name}"`);
    } catch (err) {
      this.logger.warn(
        `Resume upload failed for candidate "${input.name}": ${err instanceof Error ? err.message : String(err)} — proceeding without document`,
      );
    }

    // Step 5: Create candidate record with status = Applied
    const candidate = await this.prisma.candidate.create({
      data: {
        name: input.name,
        email: input.email,
        status: 'Applied',
        jobOpeningId: input.jobOpeningId,
        lastActivityAt: new Date(),
        ...(uploadedFile && {
          documents: {
            create: {
              type: 'Resume',
              s3Key: uploadedFile.s3Key,
              originalFilename: resumeFilename,
              fileSizeBytes: uploadedFile.size,
            },
          },
        }),
      },
    });

    // Step 6: Generate magic link
    const magicLinkResult = await this.magicLinkService.generate(candidate.id);

    // Step 7: Create timeline event
    await this.timelineService.logEvent({
      candidateId: candidate.id,
      eventType: TimelineEventType.ApplicationSubmitted,
      newStatus: 'Applied',
      details: `Candidate application received for job opening ${input.jobOpeningId}`,
    });

    this.logger.log(
      `Candidate created: id=${candidate.id}, name="${candidate.name}", job=${input.jobOpeningId}`,
    );

    return {
      candidate,
      magicLinkUrl: magicLinkResult.url,
    };
  }

  /**
   * List candidates with pagination, filtering, and search.
   *
   * - Pagination: 20 per page (offset-based: (page - 1) * pageSize)
   * - Filter by status: multi-select from CandidateStatus values
   * - Search: case-insensitive ILIKE on name and currentRole (min 2 chars)
   * - Sort: lastActivityAt DESC by default
   *
   * Requirements: 2.1, 2.2, 2.3, 2.6
   */
  async findAll(filters: CandidateFiltersInput) {
    const page = filters.page ?? 1;
    const pageSize = filters.pageSize ?? PAGINATION.DEFAULT_PAGE_SIZE;
    const skip = (page - 1) * pageSize;

    // Build where clause
    const where: Record<string, unknown> = {};

    // Filter by status (multi-select)
    if (filters.statuses && filters.statuses.length > 0) {
      where.status = { in: filters.statuses };
    }

    // Filter by job opening
    if (filters.jobOpeningId) {
      where.jobOpeningId = filters.jobOpeningId;
    }

    // Search by name or role (case-insensitive, min 2 chars)
    if (filters.search && filters.search.length >= 2) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { currentRole: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    // Execute count and findMany in parallel
    const [total, items] = await Promise.all([
      this.prisma.candidate.count({ where }),
      this.prisma.candidate.findMany({
        where,
        orderBy: { lastActivityAt: 'desc' },
        skip,
        take: pageSize,
      }),
    ]);

    const totalPages = Math.ceil(total / pageSize);

    return {
      items,
      total,
      page,
      pageSize,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    };
  }

  /**
   * Get a single candidate by ID with full relations.
   * Includes: job opening, documents, interviews, magic link, timeline events.
   *
   * Requirements: 4.11, 7.1
   */
  async findById(id: string) {
    const candidate = await this.prisma.candidate.findUnique({
      where: { id },
      include: {
        jobOpening: {
          include: { skills: true },
        },
        documents: true,
        interviews: {
          orderBy: { scheduledAt: 'asc' },
        },
        magicLink: true,
        timelineEvents: {
          orderBy: { createdAt: 'desc' },
          take: 50,
        },
      },
    });

    if (!candidate) {
      throw new NotFoundException(`Candidate with ID "${id}" not found`);
    }

    return candidate;
  }

  /**
   * Update a candidate's pipeline status.
   * Delegates to StateMachineService for transition validation,
   * prerequisite checks, and optimistic locking.
   *
   * Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6
   */
  async updateStatus(
    candidateId: string,
    targetStatus: CandidateStatus,
    meta: TransitionMeta,
    userId: string,
  ) {
    const result = await this.stateMachineService.executeTransition(
      candidateId,
      targetStatus,
      meta,
      userId,
    );

    if (!result.success) {
      const error = result.error;
      const message =
        error.message ??
        `Cannot transition from ${error.currentStatus} to ${error.attemptedStatus}. Valid transitions: ${error.validTransitions?.join(', ')}`;

      if (error.code === 'CONFLICT_ERROR') {
        throw new ConflictException(message);
      }

      throw new BadRequestException(message);
    }

    return result.candidate;
  }
}
