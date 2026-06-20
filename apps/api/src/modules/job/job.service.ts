import { Injectable, Inject, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { jobTitleSchema, skillsTagsSchema } from '@rove-hire/shared';
import type { CreateJobOpeningInput } from './dto/create-job-opening.input';
import type { UpdateJobOpeningInput } from './dto/update-job-opening.input';

/**
 * JobService handles CRUD operations for job openings.
 * - create: validates input and creates a job with associated skills
 * - findAll: returns jobs ordered by createdAt DESC with candidate counts
 * - findById: returns a single job with skills and candidate count
 * - updateStatus: restricts status changes to Open/Closed values
 * - validateJobOpen: checks if a job is open for new candidate association
 *
 * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9, 3.10
 */
@Injectable()
export class JobService {
  private readonly logger = new Logger(JobService.name);

  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  /**
   * Create a new job opening with validation.
   * - Title: 1-200 chars (required)
   * - Skills: 1-20 tags, each max 50 chars
   * - Description: optional, max 5000 chars
   * - Status defaults to "Open"
   *
   * Requirements: 3.1, 3.6, 3.7, 3.8, 3.9
   */
  async create(input: CreateJobOpeningInput) {
    // Validate title using shared schema
    const titleResult = jobTitleSchema.safeParse(input.title);
    if (!titleResult.success) {
      throw new BadRequestException(titleResult.error.issues.map((i) => i.message).join('; '));
    }

    // Validate skills using shared schema
    const skillsResult = skillsTagsSchema.safeParse(input.skills);
    if (!skillsResult.success) {
      throw new BadRequestException(skillsResult.error.issues.map((i) => i.message).join('; '));
    }

    // Validate description length
    if (input.description && input.description.length > 5000) {
      throw new BadRequestException('Description must not exceed 5000 characters');
    }

    this.logger.log(`Creating job opening: "${input.title}" with ${input.skills.length} skills`);

    const jobOpening = await this.prisma.jobOpening.create({
      data: {
        title: input.title,
        description: input.description ?? null,
        status: 'Open', // Default status
        skills: {
          create: input.skills.map((tag) => ({ tag })),
        },
      },
      include: {
        skills: true,
        _count: {
          select: { candidates: true },
        },
      },
    });

    return {
      ...jobOpening,
      candidateCount: jobOpening._count.candidates,
    };
  }

  /**
   * Retrieve all job openings ordered by most recently created.
   * Includes candidate count for each job.
   *
   * Requirements: 3.2, 3.10
   */
  async findAll() {
    const jobs = await this.prisma.jobOpening.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        skills: true,
        _count: {
          select: { candidates: true },
        },
      },
    });

    return jobs.map((job) => ({
      ...job,
      candidateCount: job._count.candidates,
    }));
  }

  /**
   * Find a single job opening by ID.
   * Returns job with skills and candidate count.
   *
   * Requirements: 3.2
   */
  async findById(id: string) {
    const job = await this.prisma.jobOpening.findUnique({
      where: { id },
      include: {
        skills: true,
        candidates: {
          select: {
            id: true,
            name: true,
            email: true,
            status: true,
            currentRole: true,
            lastActivityAt: true,
            createdAt: true,
          },
          orderBy: { lastActivityAt: 'desc' },
        },
        _count: {
          select: { candidates: true },
        },
      },
    });

    if (!job) {
      throw new NotFoundException(`Job opening with ID "${id}" not found`);
    }

    return {
      ...job,
      candidateCount: job._count.candidates,
    };
  }

  /**
   * Update the status of a job opening.
   * Restricts to Open or Closed values only.
   *
   * Requirements: 3.3, 3.5
   */
  async updateStatus(id: string, status: 'Open' | 'Closed') {
    // Validate status value
    if (status !== 'Open' && status !== 'Closed') {
      throw new BadRequestException('Status must be "Open" or "Closed"');
    }

    // Check job exists
    const existing = await this.prisma.jobOpening.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException(`Job opening with ID "${id}" not found`);
    }

    this.logger.log(`Updating job "${id}" status from "${existing.status}" to "${status}"`);

    const updated = await this.prisma.jobOpening.update({
      where: { id },
      data: { status },
      include: {
        skills: true,
        _count: {
          select: { candidates: true },
        },
      },
    });

    return {
      ...updated,
      candidateCount: updated._count.candidates,
    };
  }

  /**
   * Update a job opening's details (title, description, skills, status).
   * Validates each provided field individually.
   * Runs the mutation inside a transaction so that skill replacement is atomic.
   *
   * Requirements: 3.1, 3.3, 3.6, 3.7, 3.8, 3.9
   */
  async update(id: string, input: UpdateJobOpeningInput) {
    // Validate title if provided
    if (input.title !== undefined) {
      const titleResult = jobTitleSchema.safeParse(input.title);
      if (!titleResult.success) {
        throw new BadRequestException(titleResult.error.issues.map((i) => i.message).join('; '));
      }
    }

    // Validate skills if provided
    if (input.skills !== undefined) {
      const skillsResult = skillsTagsSchema.safeParse(input.skills);
      if (!skillsResult.success) {
        throw new BadRequestException(skillsResult.error.issues.map((i) => i.message).join('; '));
      }
    }

    // Validate description length if provided
    if (
      input.description !== undefined &&
      input.description !== null &&
      input.description.length > 5000
    ) {
      throw new BadRequestException('Description must not exceed 5000 characters');
    }

    // Check job exists
    const existing = await this.prisma.jobOpening.findUnique({ where: { id } });

    if (!existing) {
      throw new NotFoundException(`Job opening with ID "${id}" not found`);
    }

    this.logger.log(`Updating job "${id}"`);

    // Run mutation inside transaction so skill replacement is atomic
    const updated = await this.prisma.$transaction(async (tx) => {
      // Diff skills safely: add new tags first so DB trigger never sees 0 skills
      if (input.skills !== undefined) {
        const existingSkills = await tx.jobOpeningSkill.findMany({
          where: { jobOpeningId: id },
          select: { tag: true },
        });
        const existingTags = new Set(existingSkills.map((s) => s.tag));
        const newTags = new Set(input.skills);
        const tagsToAdd = input.skills.filter((t) => !existingTags.has(t));
        const tagsToRemove = existingSkills.filter((s) => !newTags.has(s.tag)).map((s) => s.tag);

        if (tagsToAdd.length > 0) {
          await tx.jobOpeningSkill.createMany({
            data: tagsToAdd.map((tag) => ({ jobOpeningId: id, tag })),
          });
        }
        if (tagsToRemove.length > 0) {
          await tx.jobOpeningSkill.deleteMany({
            where: { jobOpeningId: id, tag: { in: tagsToRemove } },
          });
        }
      }

      return tx.jobOpening.update({
        where: { id },
        data: {
          ...(input.title !== undefined && { title: input.title }),
          ...(input.description !== undefined && { description: input.description }),
          ...(input.status !== undefined && { status: input.status }),
        },
        include: {
          skills: true,
          _count: { select: { candidates: true } },
        },
      });
    });

    return {
      ...updated,
      candidateCount: updated._count.candidates,
    };
  }

  /**
   * Validate that a job is open for accepting new candidates.
   * Rejects if job is Closed.
   *
   * Requirements: 3.4
   */
  async validateJobOpen(jobOpeningId: string): Promise<void> {
    const job = await this.prisma.jobOpening.findUnique({
      where: { id: jobOpeningId },
      select: { status: true, title: true },
    });

    if (!job) {
      throw new NotFoundException(`Job opening with ID "${jobOpeningId}" not found`);
    }

    if (job.status === 'Closed') {
      throw new BadRequestException(
        `Job opening "${job.title}" is closed and not accepting new candidates`,
      );
    }
  }
}
