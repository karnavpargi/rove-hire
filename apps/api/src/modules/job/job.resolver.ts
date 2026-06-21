import { Resolver, Query, Mutation, Args } from '@nestjs/graphql';
import type { JobService } from './job.service';
import { JobOpeningType } from './job.model';
import type { CreateJobOpeningInput } from './dto/create-job-opening.input';
import type { UpdateJobOpeningStatusInput } from './dto/update-job-status.input';
import type { UpdateJobOpeningInput } from './dto/update-job-opening.input';

/**
 * JobResolver exposes GraphQL queries and mutations for job openings.
 *
 * Queries:
 * - jobOpenings: List all job openings (most recent first, with candidate counts)
 * - jobOpening(id): Get a single job opening by ID
 *
 * Mutations:
 * - createJobOpening: Create a new job opening with validation
 * - updateJobOpeningStatus: Change status to Open or Closed
 *
 * All resolvers are protected by the global JwtAuthGuard (APP_GUARD).
 *
 * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9, 3.10, 3.11
 */
@Resolver(() => JobOpeningType)
export class JobResolver {
  constructor(private readonly jobService: JobService) {}

  /**
   * Create a new job opening.
   * Validates title (1-200 chars), skills (1-20 tags, each max 50), description (max 5000).
   * Defaults status to "Open".
   *
   * Requirements: 3.1, 3.6, 3.7, 3.8, 3.9
   */
  @Mutation(() => JobOpeningType, { description: 'Create a new job opening' })
  async createJobOpening(@Args('input') input: CreateJobOpeningInput): Promise<JobOpeningType> {
    const job = await this.jobService.create(input);
    return this.mapToGraphQL(job);
  }

  /**
   * Update the status of a job opening (Open or Closed).
   *
   * Requirements: 3.3, 3.5
   */
  @Mutation(() => JobOpeningType, { description: 'Update job opening status (Open/Closed)' })
  async updateJobOpeningStatus(
    @Args('input') input: UpdateJobOpeningStatusInput,
  ): Promise<JobOpeningType> {
    const job = await this.jobService.updateStatus(input.id, input.status);
    return this.mapToGraphQL(job);
  }

  /**
   * Update details of a job opening (title, description, skills, status).
   * Only provided fields are updated; omitted fields remain unchanged.
   *
   * Requirements: 3.1, 3.3, 3.6, 3.7, 3.8, 3.9
   */
  @Mutation(() => JobOpeningType, {
    description: 'Update a job opening (title, description, skills, status)',
  })
  async updateJobOpening(@Args('input') input: UpdateJobOpeningInput): Promise<JobOpeningType> {
    const job = await this.jobService.update(input.id, input);
    return this.mapToGraphQL(job);
  }

  /**
   * List all job openings, ordered by most recently created.
   * Includes candidate count for each job.
   *
   * Requirements: 3.2, 3.10
   */
  @Query(() => [JobOpeningType], { description: 'List all job openings (most recent first)' })
  async jobOpenings(): Promise<JobOpeningType[]> {
    const jobs = await this.jobService.findAll();
    return jobs.map((job) => this.mapToGraphQL(job));
  }

  /**
   * Get a single job opening by ID.
   *
   * Requirements: 3.2
   */
  @Query(() => JobOpeningType, { description: 'Get a single job opening by ID' })
  async jobOpening(@Args('id') id: string): Promise<JobOpeningType> {
    const job = await this.jobService.findById(id);
    return this.mapToGraphQL(job);
  }

  /**
   * Map Prisma job opening result to GraphQL type.
   */
  private mapToGraphQL(job: {
    id: string;
    title: string;
    description: string | null;
    status: string;
    skills: Array<{ id: string; tag: string }>;
    candidateCount: number;
    candidates?: Array<{
      id: string;
      name: string;
      email: string;
      status: string;
      currentRole: string | null;
      lastActivityAt: Date;
      createdAt: Date;
    }>;
    createdAt: Date;
    updatedAt: Date;
  }): JobOpeningType {
    return {
      id: job.id,
      title: job.title,
      description: job.description,
      status: job.status as 'Open' | 'Closed',
      skills: job.skills.map((s) => ({ id: s.id, tag: s.tag })),
      candidateCount: job.candidateCount,
      candidates: job.candidates ?? null,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
    };
  }
}
