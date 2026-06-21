/**
 * Property 11: Query Filtering and Sorting Correctness
 *
 * Property-based tests verifying that CandidateService.findAll correctly:
 * 1. Filters candidates by status — all returned candidates have status IN the filter status array
 * 2. Filters by search query — all returned candidates contain the search query in name or currentRole (case-insensitive)
 * 3. Sorts results by lastActivityAt descending
 *
 * **Validates: Requirements 2.2, 2.3, 2.6**
 */

import { describe, it, expect, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { CandidateService } from './candidate.service';
import type { PrismaService } from '../../prisma/prisma.service';

/**
 * All possible CandidateStatus values
 */
const ALL_STATUSES = [
  'Applied',
  'FormSubmitted',
  'InterviewScheduled',
  'OfferSent',
  'Hired',
  'Rejected',
] as const;

type CandidateStatus = (typeof ALL_STATUSES)[number];

/**
 * Generates a random candidate record with a given status and random name/role/lastActivityAt
 */
function candidateArbitrary(status?: CandidateStatus) {
  return fc.record({
    id: fc.uuid(),
    name: fc.string({ minLength: 1, maxLength: 100 }).filter((s) => s.trim().length > 0),
    email: fc.emailAddress(),
    currentRole: fc.oneof(
      fc.string({ minLength: 1, maxLength: 100 }).filter((s) => s.trim().length > 0),
      fc.constant(null),
    ),
    status: status ? fc.constant(status) : fc.constantFrom(...ALL_STATUSES),
    lastActivityAt: fc.date({
      min: new Date('2023-01-01'),
      max: new Date('2025-12-31'),
    }),
    jobOpeningId: fc.uuid(),
    createdAt: fc.date({ min: new Date('2023-01-01'), max: new Date('2025-12-31') }),
    updatedAt: fc.date({ min: new Date('2023-01-01'), max: new Date('2025-12-31') }),
  });
}

/**
 * Generates a dataset of candidates with varying statuses
 */
const candidateDatasetArbitrary = fc.array(candidateArbitrary(), {
  minLength: 1,
  maxLength: 50,
});

/**
 * Generates a non-empty subset of statuses for filtering
 */
const statusFilterArbitrary = fc
  .subarray([...ALL_STATUSES], { minLength: 1 })
  .filter((arr) => arr.length > 0);

/**
 * Generates a search query (min 2 chars as per requirements)
 */
const searchQueryArbitrary = fc
  .string({ minLength: 2, maxLength: 20 })
  .filter((s) => /^[a-zA-Z]+$/.test(s));

describe('Property 11: Query Filtering and Sorting Correctness', () => {
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

    // Create CandidateService with only prisma mock (other deps not needed for findAll)
    service = new CandidateService(
      mockPrisma as unknown as PrismaService,
      {} as any, // fileService
      {} as any, // magicLinkService
      {} as any, // jobService
      {} as any, // stateMachineService
      {} as any, // timelineService
    );
  });

  it('all returned candidates have status IN the filter status array', async () => {
    await fc.assert(
      fc.asyncProperty(
        candidateDatasetArbitrary,
        statusFilterArbitrary,
        async (candidates, statuses) => {
          // Simulate what Prisma would return: only candidates whose status is in the filter
          const filtered = candidates.filter((c) => statuses.includes(c.status as CandidateStatus));
          const sorted = [...filtered].sort(
            (a, b) => b.lastActivityAt.getTime() - a.lastActivityAt.getTime(),
          );
          const page = sorted.slice(0, 20);

          mockPrisma.candidate.count.mockResolvedValue(filtered.length);
          mockPrisma.candidate.findMany.mockResolvedValue(page);

          const result = await service.findAll({ statuses, page: 1 });

          // Property: every returned item has a status IN the filter set
          for (const item of result.items) {
            expect(statuses).toContain(item.status);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it('all returned candidates contain search query in name or currentRole (case-insensitive)', async () => {
    await fc.assert(
      fc.asyncProperty(
        candidateDatasetArbitrary,
        searchQueryArbitrary,
        async (candidates, search) => {
          // Simulate what Prisma would return: candidates matching search in name or role
          const filtered = candidates.filter((c) => {
            const lowerSearch = search.toLowerCase();
            const nameMatch = c.name.toLowerCase().includes(lowerSearch);
            const roleMatch = c.currentRole
              ? c.currentRole.toLowerCase().includes(lowerSearch)
              : false;
            return nameMatch || roleMatch;
          });
          const sorted = [...filtered].sort(
            (a, b) => b.lastActivityAt.getTime() - a.lastActivityAt.getTime(),
          );
          const page = sorted.slice(0, 20);

          mockPrisma.candidate.count.mockResolvedValue(filtered.length);
          mockPrisma.candidate.findMany.mockResolvedValue(page);

          const result = await service.findAll({ search, page: 1 });

          // Property: every returned item matches the search query in name or currentRole
          const lowerSearch = search.toLowerCase();
          for (const item of result.items) {
            const nameMatch = item.name.toLowerCase().includes(lowerSearch);
            const roleMatch = item.currentRole
              ? item.currentRole.toLowerCase().includes(lowerSearch)
              : false;
            expect(nameMatch || roleMatch).toBe(true);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it('results are sorted by lastActivityAt descending', async () => {
    // Use a dataset with guaranteed-valid dates for sorting tests
    const validDateCandidateDataset = fc.array(
      fc.record({
        id: fc.uuid(),
        name: fc.string({ minLength: 1, maxLength: 50 }).filter((s) => s.trim().length > 0),
        email: fc.emailAddress(),
        currentRole: fc.oneof(
          fc.string({ minLength: 1, maxLength: 50 }).filter((s) => s.trim().length > 0),
          fc.constant(null),
        ),
        status: fc.constantFrom(...ALL_STATUSES),
        lastActivityAt: fc
          .integer({ min: 1672531200000, max: 1767139200000 })
          .map((ts) => new Date(ts)),
        jobOpeningId: fc.uuid(),
        createdAt: fc.constant(new Date('2024-01-01')),
        updatedAt: fc.constant(new Date('2024-01-01')),
      }),
      { minLength: 2, maxLength: 50 },
    );

    await fc.assert(
      fc.asyncProperty(validDateCandidateDataset, async (candidates) => {
        // Sort the full dataset by lastActivityAt DESC as the service would
        const sorted = [...candidates].sort(
          (a, b) => b.lastActivityAt.getTime() - a.lastActivityAt.getTime(),
        );
        const page = sorted.slice(0, 20);

        mockPrisma.candidate.count.mockReset();
        mockPrisma.candidate.findMany.mockReset();
        mockPrisma.candidate.count.mockResolvedValue(candidates.length);
        mockPrisma.candidate.findMany.mockResolvedValue(page);

        const result = await service.findAll({ page: 1 });

        // Property: items are in descending order of lastActivityAt
        for (let i = 1; i < result.items.length; i++) {
          const prev = new Date(result.items[i - 1].lastActivityAt).getTime();
          const curr = new Date(result.items[i].lastActivityAt).getTime();
          expect(prev).toBeGreaterThanOrEqual(curr);
        }
      }),
      { numRuns: 100 },
    );
  });

  it('combined status filter + search returns only matching candidates', async () => {
    await fc.assert(
      fc.asyncProperty(
        candidateDatasetArbitrary,
        statusFilterArbitrary,
        searchQueryArbitrary,
        async (candidates, statuses, search) => {
          // Simulate combined filter: status IN set AND (name OR role contains search)
          const filtered = candidates.filter((c) => {
            const statusMatch = statuses.includes(c.status as CandidateStatus);
            const lowerSearch = search.toLowerCase();
            const nameMatch = c.name.toLowerCase().includes(lowerSearch);
            const roleMatch = c.currentRole
              ? c.currentRole.toLowerCase().includes(lowerSearch)
              : false;
            return statusMatch && (nameMatch || roleMatch);
          });
          const sorted = [...filtered].sort(
            (a, b) => b.lastActivityAt.getTime() - a.lastActivityAt.getTime(),
          );
          const page = sorted.slice(0, 20);

          mockPrisma.candidate.count.mockResolvedValue(filtered.length);
          mockPrisma.candidate.findMany.mockResolvedValue(page);

          const result = await service.findAll({ statuses, search, page: 1 });

          // Property: every returned item satisfies BOTH filters
          const lowerSearch = search.toLowerCase();
          for (const item of result.items) {
            // Status filter
            expect(statuses).toContain(item.status);
            // Search filter
            const nameMatch = item.name.toLowerCase().includes(lowerSearch);
            const roleMatch = item.currentRole
              ? item.currentRole.toLowerCase().includes(lowerSearch)
              : false;
            expect(nameMatch || roleMatch).toBe(true);
          }

          // And sorted descending by lastActivityAt
          for (let i = 1; i < result.items.length; i++) {
            const prev = new Date(result.items[i - 1].lastActivityAt).getTime();
            const curr = new Date(result.items[i].lastActivityAt).getTime();
            expect(prev).toBeGreaterThanOrEqual(curr);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it('the where clause sent to Prisma includes status filter when provided', async () => {
    await fc.assert(
      fc.asyncProperty(statusFilterArbitrary, async (statuses) => {
        // Reset mocks for each property run
        mockPrisma.candidate.count.mockReset();
        mockPrisma.candidate.findMany.mockReset();
        mockPrisma.candidate.count.mockResolvedValue(0);
        mockPrisma.candidate.findMany.mockResolvedValue([]);

        await service.findAll({ statuses, page: 1 });

        // Verify the where clause includes the status filter
        const countCall = mockPrisma.candidate.count.mock.calls[0][0];
        const findManyCall = mockPrisma.candidate.findMany.mock.calls[0][0];

        expect(countCall.where.status).toEqual({ in: statuses });
        expect(findManyCall.where.status).toEqual({ in: statuses });
        expect(findManyCall.orderBy).toEqual({ lastActivityAt: 'desc' });
      }),
      { numRuns: 100 },
    );
  });

  it('the where clause includes OR search condition when search is provided (min 2 chars)', async () => {
    await fc.assert(
      fc.asyncProperty(searchQueryArbitrary, async (search) => {
        // Reset mocks for each property run
        mockPrisma.candidate.count.mockReset();
        mockPrisma.candidate.findMany.mockReset();
        mockPrisma.candidate.count.mockResolvedValue(0);
        mockPrisma.candidate.findMany.mockResolvedValue([]);

        await service.findAll({ search, page: 1 });

        // Verify the where clause includes OR search
        const findManyCall = mockPrisma.candidate.findMany.mock.calls[0][0];
        expect(findManyCall.where.OR).toEqual([
          { name: { contains: search, mode: 'insensitive' } },
          { currentRole: { contains: search, mode: 'insensitive' } },
        ]);
      }),
      { numRuns: 100 },
    );
  });
});
