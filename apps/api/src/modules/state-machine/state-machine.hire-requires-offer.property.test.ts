/**
 * Property 3: State Machine — Hire Requires Offer Document
 *
 * Property-based tests verifying that transitioning a candidate to Hired
 * succeeds only when an offer_letter document exists for that candidate.
 *
 * **Validates: Requirements 9.1, 10.5, 8.9**
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { StateMachineService, StateMachineErrorCode } from './state-machine.service';
import { CandidateStatus } from '@rove-hire/shared';

describe('Property 3: State Machine — Hire Requires Offer Document', () => {
  let service: StateMachineService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      $transaction: vi.fn(),
    };
    service = new StateMachineService(mockPrisma);
  });

  /**
   * Arbitrary for generating candidate IDs (UUID-like strings).
   */
  const candidateIdArb = fc.uuid();

  /**
   * Arbitrary for generating user IDs (UUID-like strings).
   */
  const userIdArb = fc.uuid();

  /**
   * Arbitrary for generating offer letter document objects.
   * Represents a document that exists in the system.
   */
  const offerDocArb = fc.record({
    id: fc.uuid(),
    candidateId: fc.uuid(),
    type: fc.constant('OfferLetter' as const),
    s3Key: fc.stringMatching(/^[a-zA-Z0-9]{10,50}$/).map((s) => `documents/${s}.pdf`),
    originalFilename: fc.stringMatching(/^[a-zA-Z0-9]{1,30}$/).map((s) => `${s}.pdf`),
    fileSizeBytes: fc.integer({ min: 1024, max: 10485760 }),
    createdAt: fc.date(),
  });

  it('transition to Hired FAILS when no offer letter document exists', async () => {
    /**
     * **Validates: Requirements 9.1, 10.5, 8.9**
     *
     * For any candidate in OfferSent status WITHOUT an offer letter document,
     * transitioning to Hired must fail with PREREQUISITE_FAILED error.
     */
    await fc.assert(
      fc.asyncProperty(
        candidateIdArb,
        userIdArb,
        async (candidateId, userId) => {
          // Mock transaction: candidate is in OfferSent, no offer doc found
          mockPrisma.$transaction.mockImplementation(async (fn: any) => {
            const tx = {
              $queryRaw: vi.fn().mockResolvedValue([{ id: candidateId, status: 'OfferSent' }]),
              candidate: { update: vi.fn() },
              document: { findFirst: vi.fn().mockResolvedValue(null) },
              timelineEvent: { create: vi.fn() },
            };
            return fn(tx);
          });

          const result = await service.executeTransition(
            candidateId,
            CandidateStatus.Hired,
            {},
            userId,
          );

          expect(result.success).toBe(false);
          if (!result.success) {
            expect(result.error.code).toBe(StateMachineErrorCode.PREREQUISITE_FAILED);
            expect(result.error.message).toContain('offer letter');
          }
        },
      ),
      { numRuns: 50 },
    );
  });

  it('transition to Hired SUCCEEDS when offer letter document exists', async () => {
    /**
     * **Validates: Requirements 9.1, 10.5, 8.9**
     *
     * For any candidate in OfferSent status WITH an offer letter document,
     * transitioning to Hired must succeed.
     */
    await fc.assert(
      fc.asyncProperty(
        candidateIdArb,
        userIdArb,
        offerDocArb,
        async (candidateId, userId, offerDoc) => {
          const updatedCandidate = {
            id: candidateId,
            status: CandidateStatus.Hired,
            lastActivityAt: new Date(),
          };

          // Mock transaction: candidate is in OfferSent, offer doc exists
          mockPrisma.$transaction.mockImplementation(async (fn: any) => {
            const tx = {
              $queryRaw: vi.fn().mockResolvedValue([{ id: candidateId, status: 'OfferSent' }]),
              candidate: { update: vi.fn().mockResolvedValue(updatedCandidate) },
              document: { findFirst: vi.fn().mockResolvedValue(offerDoc) },
              timelineEvent: { create: vi.fn().mockResolvedValue({}) },
            };
            return fn(tx);
          });

          const result = await service.executeTransition(
            candidateId,
            CandidateStatus.Hired,
            {},
            userId,
          );

          expect(result.success).toBe(true);
          if (result.success) {
            expect(result.candidate.status).toBe(CandidateStatus.Hired);
          }
        },
      ),
      { numRuns: 50 },
    );
  });

  it('document lookup queries the correct candidateId and type', async () => {
    /**
     * **Validates: Requirements 9.1, 10.5, 8.9**
     *
     * For any candidate in OfferSent status, the system must query for
     * documents with the exact candidateId and type "OfferLetter" when
     * attempting transition to Hired.
     */
    await fc.assert(
      fc.asyncProperty(
        candidateIdArb,
        userIdArb,
        async (candidateId, userId) => {
          const findFirstMock = vi.fn().mockResolvedValue(null);

          mockPrisma.$transaction.mockImplementation(async (fn: any) => {
            const tx = {
              $queryRaw: vi.fn().mockResolvedValue([{ id: candidateId, status: 'OfferSent' }]),
              candidate: { update: vi.fn() },
              document: { findFirst: findFirstMock },
              timelineEvent: { create: vi.fn() },
            };
            return fn(tx);
          });

          await service.executeTransition(
            candidateId,
            CandidateStatus.Hired,
            {},
            userId,
          );

          // Verify the document query uses the correct candidateId and type
          expect(findFirstMock).toHaveBeenCalledWith({
            where: {
              candidateId,
              type: 'OfferLetter',
            },
          });
        },
      ),
      { numRuns: 50 },
    );
  });

  it('candidate update is NOT called when offer document is missing', async () => {
    /**
     * **Validates: Requirements 9.1, 10.5, 8.9**
     *
     * When transitioning to Hired fails due to missing offer document,
     * the candidate record must NOT be modified (status stays OfferSent).
     */
    await fc.assert(
      fc.asyncProperty(
        candidateIdArb,
        userIdArb,
        async (candidateId, userId) => {
          const updateMock = vi.fn();

          mockPrisma.$transaction.mockImplementation(async (fn: any) => {
            const tx = {
              $queryRaw: vi.fn().mockResolvedValue([{ id: candidateId, status: 'OfferSent' }]),
              candidate: { update: updateMock },
              document: { findFirst: vi.fn().mockResolvedValue(null) },
              timelineEvent: { create: vi.fn() },
            };
            return fn(tx);
          });

          await service.executeTransition(
            candidateId,
            CandidateStatus.Hired,
            {},
            userId,
          );

          // candidate.update should NOT have been called
          expect(updateMock).not.toHaveBeenCalled();
        },
      ),
      { numRuns: 50 },
    );
  });
});
