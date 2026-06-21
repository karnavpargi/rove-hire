/**
 * Property 16: Closed Job Rejects New Candidates
 *
 * Property-based tests verifying that any candidate creation attempt
 * referencing a job opening with status "Closed" is rejected with
 * an appropriate error indicating the job is not accepting new candidates.
 *
 * **Validates: Requirements 3.4, 4.9**
 */

import { describe, it, expect, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { BadRequestException } from '@nestjs/common';
import { JobService } from './job.service';
import type { PrismaService } from '../../prisma/prisma.service';

describe('Property 16: Closed Job Rejects New Candidates', () => {
  let service: JobService;
  let mockPrisma: { jobOpening: { findUnique: ReturnType<typeof vi.fn> } };

  beforeEach(() => {
    mockPrisma = {
      jobOpening: {
        findUnique: vi.fn(),
      },
    };
    service = new JobService(mockPrisma as unknown as PrismaService);
  });

  /**
   * Arbitrary: generates random UUID-like strings for job IDs
   */
  const jobIdArbitrary = fc.uuid();

  /**
   * Arbitrary: generates random job titles (1-200 chars)
   */
  const jobTitleArbitrary = fc.string({ minLength: 1, maxLength: 200 });

  it('always rejects validateJobOpen when job status is Closed', async () => {
    await fc.assert(
      fc.asyncProperty(jobIdArbitrary, jobTitleArbitrary, async (jobId, jobTitle) => {
        // Mock: job exists with Closed status
        mockPrisma.jobOpening.findUnique.mockResolvedValue({
          status: 'Closed',
          title: jobTitle,
        });

        // validateJobOpen should throw BadRequestException for closed jobs
        await expect(service.validateJobOpen(jobId)).rejects.toThrow(BadRequestException);

        // Verify the call was made with the correct job ID
        expect(mockPrisma.jobOpening.findUnique).toHaveBeenCalledWith({
          where: { id: jobId },
          select: { status: true, title: true },
        });
      }),
      { numRuns: 200 },
    );
  });

  it('error message indicates the job is not accepting new candidates', async () => {
    await fc.assert(
      fc.asyncProperty(jobIdArbitrary, jobTitleArbitrary, async (jobId, jobTitle) => {
        mockPrisma.jobOpening.findUnique.mockResolvedValue({
          status: 'Closed',
          title: jobTitle,
        });

        try {
          await service.validateJobOpen(jobId);
          // Should never reach here
          expect.fail('Expected BadRequestException to be thrown');
        } catch (error) {
          expect(error).toBeInstanceOf(BadRequestException);
          const message = (error as BadRequestException).message;
          // Verify the error message contains relevant info
          expect(message.toLowerCase()).toContain('not accepting new candidates');
        }
      }),
      { numRuns: 200 },
    );
  });

  it('open jobs are accepted by validateJobOpen (no exception thrown)', async () => {
    await fc.assert(
      fc.asyncProperty(jobIdArbitrary, jobTitleArbitrary, async (jobId, jobTitle) => {
        // Mock: job exists with Open status
        mockPrisma.jobOpening.findUnique.mockResolvedValue({
          status: 'Open',
          title: jobTitle,
        });

        // validateJobOpen should NOT throw for open jobs
        await expect(service.validateJobOpen(jobId)).resolves.toBeUndefined();
      }),
      { numRuns: 200 },
    );
  });

  it('rejection is consistent regardless of job title content', async () => {
    // Generate job titles with various characters: unicode, special chars, etc.
    const complexTitleArbitrary = fc.oneof(
      fc.string({ minLength: 1, maxLength: 200 }),
      fc.constantFrom(
        'Senior Engineer',
        'Jr. Developer (Contract)',
        'VP of Engineering — Remote',
        '高级工程师',
        'Développeur Full-Stack',
      ),
    );

    await fc.assert(
      fc.asyncProperty(jobIdArbitrary, complexTitleArbitrary, async (jobId, jobTitle) => {
        mockPrisma.jobOpening.findUnique.mockResolvedValue({
          status: 'Closed',
          title: jobTitle,
        });

        await expect(service.validateJobOpen(jobId)).rejects.toThrow(BadRequestException);
      }),
      { numRuns: 200 },
    );
  });
});
