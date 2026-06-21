/**
 * Property 12: Pagination Correctness
 *
 * Property-based tests verifying that the CandidateService.findAll()
 * pagination implementation correctly:
 * 1. Returns at most pageSize items per page
 * 2. Total items across all pages equals full dataset count
 * 3. No duplicate candidates across pages
 * 4. First page has hasPreviousPage=false, last page has hasNextPage=false
 *
 * **Validates: Requirements 2.1**
 */

import { describe, it, expect, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { CandidateService } from './candidate.service';
import type { PrismaService } from '../../prisma/prisma.service';
import { PAGINATION } from '@rove-hire/shared';

/**
 * Helper: generates a mock candidate dataset of size N
 */
function generateCandidateDataset(n: number) {
  return Array.from({ length: n }, (_, i) => ({
    id: `candidate-${i}`,
    name: `Candidate ${i}`,
    email: `candidate${i}@example.com`,
    status: 'Applied',
    jobOpeningId: 'job-1',
    lastActivityAt: new Date(Date.now() - i * 60000), // each 1 min apart, sorted DESC
    createdAt: new Date(),
    updatedAt: new Date(),
  }));
}

describe('Property 12: Pagination Correctness', () => {
  let service: CandidateService;
  let mockPrisma: {
    candidate: {
      count: ReturnType<typeof vi.fn>;
      findMany: ReturnType<typeof vi.fn>;
    };
  };

  beforeEach(() => {
    mockPrisma = {
      candidate: {
        count: vi.fn(),
        findMany: vi.fn(),
      },
    };

    // Create the service with only PrismaService as a real dependency — the rest are unused for findAll
    service = new CandidateService(
      mockPrisma as unknown as PrismaService,
      {} as any, // FileService (not used by findAll)
      {} as any, // MagicLinkService (not used by findAll)
      {} as any, // JobService (not used by findAll)
      {} as any, // StateMachineService (not used by findAll)
      {} as any, // TimelineService (not used by findAll)
    );
  });

  const pageSize = PAGINATION.DEFAULT_PAGE_SIZE; // 20

  /**
   * Arbitrary: generate valid page numbers based on dataset size
   */
  const pageNumberArb = (totalPages: number) =>
    fc.integer({ min: 1, max: Math.max(1, totalPages) });

  it('page contains at most pageSize items (min(pageSize, remaining))', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 150 }), // at least 1 candidate
        async (n) => {
          const dataset = generateCandidateDataset(n);
          const totalPages = Math.ceil(n / pageSize);
          const page = fc.sample(pageNumberArb(totalPages), 1)[0];

          const skip = (page - 1) * pageSize;
          const expectedItems = dataset.slice(skip, skip + pageSize);

          mockPrisma.candidate.count.mockResolvedValue(n);
          mockPrisma.candidate.findMany.mockResolvedValue(expectedItems);

          const result = await service.findAll({ page, pageSize });

          // Page should contain at most pageSize items
          expect(result.items.length).toBeLessThanOrEqual(pageSize);

          // Page should contain exactly min(pageSize, N - (page-1)*pageSize) items
          const expectedCount = Math.min(pageSize, n - (page - 1) * pageSize);
          expect(result.items.length).toBe(expectedCount);
        },
      ),
      { numRuns: 200 },
    );
  });

  it('total items across all pages equals full dataset count (no loss)', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 150 }), // at least 1 candidate
        async (n) => {
          const dataset = generateCandidateDataset(n);
          const totalPages = Math.ceil(n / pageSize);

          let allItems: any[] = [];

          // Fetch every page and accumulate items
          for (let page = 1; page <= totalPages; page++) {
            const skip = (page - 1) * pageSize;
            const pageItems = dataset.slice(skip, skip + pageSize);

            mockPrisma.candidate.count.mockResolvedValue(n);
            mockPrisma.candidate.findMany.mockResolvedValue(pageItems);

            const result = await service.findAll({ page, pageSize });
            allItems = allItems.concat(result.items);
          }

          // Union of all pages should equal the full dataset size
          expect(allItems.length).toBe(n);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('no duplicate candidates across pages (union is disjoint)', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 150 }), // at least 1 candidate
        async (n) => {
          const dataset = generateCandidateDataset(n);
          const totalPages = Math.ceil(n / pageSize);

          const seenIds = new Set<string>();
          let duplicateFound = false;

          for (let page = 1; page <= totalPages; page++) {
            const skip = (page - 1) * pageSize;
            const pageItems = dataset.slice(skip, skip + pageSize);

            mockPrisma.candidate.count.mockResolvedValue(n);
            mockPrisma.candidate.findMany.mockResolvedValue(pageItems);

            const result = await service.findAll({ page, pageSize });

            for (const item of result.items) {
              if (seenIds.has(item.id)) {
                duplicateFound = true;
                break;
              }
              seenIds.add(item.id);
            }
          }

          expect(duplicateFound).toBe(false);
          expect(seenIds.size).toBe(n);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('first page has hasPreviousPage=false, last page has hasNextPage=false', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 150 }), // at least 1 candidate to have meaningful pages
        async (n) => {
          const dataset = generateCandidateDataset(n);
          const totalPages = Math.ceil(n / pageSize);

          // Check first page
          const firstPageItems = dataset.slice(0, pageSize);
          mockPrisma.candidate.count.mockResolvedValue(n);
          mockPrisma.candidate.findMany.mockResolvedValue(firstPageItems);

          const firstResult = await service.findAll({ page: 1, pageSize });
          expect(firstResult.hasPreviousPage).toBe(false);

          // Check last page
          const lastSkip = (totalPages - 1) * pageSize;
          const lastPageItems = dataset.slice(lastSkip, lastSkip + pageSize);
          mockPrisma.candidate.count.mockResolvedValue(n);
          mockPrisma.candidate.findMany.mockResolvedValue(lastPageItems);

          const lastResult = await service.findAll({ page: totalPages, pageSize });
          expect(lastResult.hasNextPage).toBe(false);

          // If there are multiple pages, first page should have hasNextPage=true
          if (totalPages > 1) {
            expect(firstResult.hasNextPage).toBe(true);
            expect(lastResult.hasPreviousPage).toBe(true);
          }
        },
      ),
      { numRuns: 200 },
    );
  });

  it('pagination metadata is correct (total, page, pageSize, totalPages)', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 150 }), // at least 1 candidate for meaningful metadata
        fc.integer({ min: 1, max: 10 }), // page number (we clamp it to valid range)
        async (n, rawPage) => {
          const dataset = generateCandidateDataset(n);
          const totalPages = Math.ceil(n / pageSize);
          const page = Math.min(rawPage, totalPages); // clamp to valid range

          const skip = (page - 1) * pageSize;
          const pageItems = dataset.slice(skip, skip + pageSize);

          mockPrisma.candidate.count.mockResolvedValue(n);
          mockPrisma.candidate.findMany.mockResolvedValue(pageItems);

          const result = await service.findAll({ page, pageSize });

          // Verify metadata
          expect(result.total).toBe(n);
          expect(result.page).toBe(page);
          expect(result.pageSize).toBe(pageSize);
          expect(result.totalPages).toBe(totalPages);
        },
      ),
      { numRuns: 200 },
    );
  });
});
