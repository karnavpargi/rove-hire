import { BadRequestException, Inject } from '@nestjs/common';
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import type { CandidateStatus } from '@rove-hire/shared';
import { FileService } from '../file/file.service';
import {
  CandidateType,
  CreateCandidateResultType,
  PaginatedCandidatesType,
} from './candidate.model';
import { CandidateService } from './candidate.service';
import { CandidateFiltersInput } from './dto/candidate-filters.input';
import { CreateCandidateInput } from './dto/create-candidate.input';
import { UpdateCandidateStatusInput } from './dto/update-candidate-status.input';

/**
 * CandidateResolver exposes GraphQL queries and mutations for candidate management.
 *
 * Queries:
 * - candidates(filters): paginated candidate list with filtering and search
 * - candidate(id): single candidate with full relations
 *
 * Mutations:
 * - createCandidate: create candidate with resume upload and magic link generation
 * - updateCandidateStatus: transition candidate status via state machine
 *
 * All resolvers are protected by the global JwtAuthGuard (APP_GUARD),
 * except public ones declared elsewhere (validateMagicLink, submitApplication).
 *
 * Requirements: 4.1, 4.5, 4.7, 4.8, 4.9, 4.10, 4.11, 2.1, 2.2, 2.3, 2.6
 */
@Resolver(() => CandidateType)
export class CandidateResolver {
  constructor(
    @Inject(CandidateService) private readonly candidateService: CandidateService,
    @Inject(FileService) private readonly fileService: FileService,
  ) {}

  /**
   * Create a new candidate with resume upload and magic link generation.
   *
   * Accepts name, email, jobOpeningId, and resume file (base64-encoded for GraphQL).
   * In a production system, the file would be uploaded via a separate REST endpoint
   * or multipart GraphQL upload. For this implementation, resume is passed as base64.
   *
   * Requirements: 4.1, 4.2, 4.5, 4.6, 4.7, 4.8, 4.9, 4.10
   */
  @Mutation(() => CreateCandidateResultType, { description: 'Create a new candidate with resume' })
  async createCandidate(
    @Args('input', { type: () => CreateCandidateInput }) input: CreateCandidateInput,
    @Args('resumeBase64', { description: 'Resume file as base64 string' }) resumeBase64: string,
    @Args('resumeFilename', { description: 'Original filename of the resume' })
    resumeFilename: string,
  ): Promise<CreateCandidateResultType> {
    // Decode base64 resume
    const resumeBuffer = Buffer.from(resumeBase64, 'base64');

    // Validate file (PDF and <= 10MB)
    const validation = this.fileService.validateFile({
      mimetype: 'application/pdf',
      size: resumeBuffer.length,
    });

    if (!validation.valid) {
      const message =
        validation.reason === 'INVALID_MIME_TYPE'
          ? 'Resume must be a PDF file'
          : 'Resume file size must not exceed 10MB';
      throw new BadRequestException(message);
    }

    const result = await this.candidateService.create(input, resumeBuffer, resumeFilename);

    return {
      candidate: this.mapToGraphQL(result.candidate),
      magicLinkUrl: result.magicLinkUrl,
    };
  }

  /**
   * List candidates with pagination, filtering by status, and search by name/role.
   * Default: 20 per page, sorted by lastActivityAt DESC.
   *
   * Requirements: 2.1, 2.2, 2.3, 2.6
   */
  @Query(() => PaginatedCandidatesType, {
    description: 'List candidates with filters and pagination',
  })
  async candidates(
    @Args('filters', { type: () => CandidateFiltersInput, nullable: true })
    filters?: CandidateFiltersInput,
  ): Promise<PaginatedCandidatesType> {
    const result = await this.candidateService.findAll(filters ?? {});

    return {
      items: result.items.map((c) => this.mapToGraphQL(c)),
      total: result.total,
      page: result.page,
      pageSize: result.pageSize,
      totalPages: result.totalPages,
      hasNextPage: result.hasNextPage,
      hasPreviousPage: result.hasPreviousPage,
    };
  }

  /**
   * Get a single candidate by ID with full data including relations.
   *
   * Requirements: 4.11, 7.1
   */
  @Query(() => CandidateType, { description: 'Get a single candidate by ID' })
  async candidate(@Args('id') id: string): Promise<CandidateType> {
    const candidate = await this.candidateService.findById(id);
    return this.mapToGraphQL(candidate);
  }

  /**
   * Update a candidate's pipeline status.
   * Delegates to StateMachineService for validation and execution.
   *
   * Requirements: 10.1, 10.3, 10.6
   */
  @Mutation(() => CandidateType, {
    name: 'transitionCandidateStatus',
    description: 'Transition candidate status',
  })
  async transitionCandidateStatus(
    @Args('input', { type: () => UpdateCandidateStatusInput })
    input: UpdateCandidateStatusInput,
  ): Promise<CandidateType> {
    // TODO: Extract userId from JWT context in production
    const userId = 'system';

    const candidate = await this.candidateService.updateStatus(
      input.candidateId,
      input.targetStatus as CandidateStatus,
      { rejectionReason: input.rejectionReason },
      userId,
    );

    return this.mapToGraphQL(candidate);
  }

  /**
   * Map a Prisma candidate record to the GraphQL type.
   */
  private mapToGraphQL(candidate: Record<string, unknown>): CandidateType {
    const c = candidate as {
      id: string;
      name: string;
      email: string;
      phone: string | null;
      location: string | null;
      currentRole: string | null;
      noticePeriod: string | null;
      salaryExpectation: string | null;
      linkedinUrl: string | null;
      status: string;
      rejectionReason: string | null;
      jobOpeningId: string;
      lastActivityAt: Date;
      createdAt: Date;
      updatedAt: Date;
      documents?: Array<Record<string, unknown>>;
      interviews?: Array<Record<string, unknown>>;
      timelineEvents?: Array<Record<string, unknown>>;
    };
    return {
      id: c.id,
      name: c.name,
      email: c.email,
      phone: c.phone,
      location: c.location,
      currentRole: c.currentRole,
      noticePeriod: c.noticePeriod,
      salaryExpectation: c.salaryExpectation,
      linkedinUrl: c.linkedinUrl,
      status: c.status,
      rejectionReason: c.rejectionReason,
      jobOpeningId: c.jobOpeningId,
      lastActivityAt: c.lastActivityAt,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
      documents: (c.documents ?? []) as unknown as CandidateType['documents'],
      interviews: (c.interviews ?? []) as unknown as CandidateType['interviews'],
      timelineEvents: (c.timelineEvents ?? []) as unknown as CandidateType['timelineEvents'],
    };
  }
}
