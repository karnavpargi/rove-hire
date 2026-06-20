/**
 * Property 4: State Machine — Rejection Reason Validation
 *
 * Property-based tests verifying that transitioning a candidate to Rejected
 * succeeds only when the provided rejection reason is between 5 and 500 characters.
 * Reasons that are empty, too short (<5 chars), or too long (>500 chars) must
 * be rejected with PREREQUISITE_FAILED error.
 *
 * **Validates: Requirements 10.6, 9.3, 9.4**
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { StateMachineService, StateMachineErrorCode } from './state-machine.service';
import { CandidateStatus } from '@rove-hire/shared';

describe('Property 4: State Machine — Rejection Reason Validation', () => {
  let service: StateMachineService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      $transaction: vi.fn(),
    };
    service = new StateMachineService(mockPrisma);
  });

  /**
   * Arbitrary for candidate IDs.
   */
  const candidateIdArb = fc.uuid();

  /**
   * Arbitrary for user IDs.
   */
  const userIdArb = fc.uuid();

  /**
   * Non-terminal statuses that can transition to Rejected.
   * Applied, FormSubmitted, InterviewScheduled, OfferSent can all reject.
   */
  const nonTerminalStatusArb = fc.constantFrom(
    CandidateStatus.Applied,
    CandidateStatus.FormSubmitted,
    CandidateStatus.InterviewScheduled,
    CandidateStatus.OfferSent,
  );

  /**
   * Arbitrary for valid rejection reasons: 5-500 characters.
   */
  const validReasonArb = fc.string({ minLength: 5, maxLength: 500 });

  /**
   * Arbitrary for rejection reasons that are too short: 1-4 characters.
   */
  const tooShortReasonArb = fc.string({ minLength: 1, maxLength: 4 });

  /**
   * Arbitrary for rejection reasons that are too long: 501-600 characters.
   */
  const tooLongReasonArb = fc.string({ minLength: 501, maxLength: 600 });

  it('rejection with valid reason (5-500 chars) SUCCEEDS', async () => {
    /**
     * **Validates: Requirements 10.6, 9.3, 9.4**
     *
     * For any candidate in a non-terminal status and any rejection reason
     * between 5 and 500 characters, transition to Rejected must succeed.
     */
    await fc.assert(
      fc.asyncProperty(
        candidateIdArb,
        userIdArb,
        nonTerminalStatusArb,
        validReasonArb,
        async (candidateId, userId, currentStatus, reason) => {
          const updatedCandidate = {
            id: candidateId,
            status: CandidateStatus.Rejected,
            rejectionReason: reason,
            lastActivityAt: new Date(),
          };

          mockPrisma.$transaction.mockImplementation(async (fn: any) => {
            const tx = {
              $queryRaw: vi.fn().mockResolvedValue([{ id: candidateId, status: currentStatus }]),
              candidate: { update: vi.fn().mockResolvedValue(updatedCandidate) },
              document: { findFirst: vi.fn() },
              timelineEvent: { create: vi.fn().mockResolvedValue({}) },
            };
            return fn(tx);
          });

          const result = await service.executeTransition(
            candidateId,
            CandidateStatus.Rejected,
            { rejectionReason: reason },
            userId,
          );

          expect(result.success).toBe(true);
          if (result.success) {
            expect(result.candidate.status).toBe(CandidateStatus.Rejected);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it('rejection with too-short reason (1-4 chars) FAILS with PREREQUISITE_FAILED', async () => {
    /**
     * **Validates: Requirements 10.6, 9.3, 9.4**
     *
     * For any candidate in a non-terminal status and any rejection reason
     * shorter than 5 characters, the transition must be rejected.
     */
    await fc.assert(
      fc.asyncProperty(
        candidateIdArb,
        userIdArb,
        nonTerminalStatusArb,
        tooShortReasonArb,
        async (candidateId, userId, currentStatus, reason) => {
          mockPrisma.$transaction.mockImplementation(async (fn: any) => {
            const tx = {
              $queryRaw: vi.fn().mockResolvedValue([{ id: candidateId, status: currentStatus }]),
              candidate: { update: vi.fn() },
              document: { findFirst: vi.fn() },
              timelineEvent: { create: vi.fn() },
            };
            return fn(tx);
          });

          const result = await service.executeTransition(
            candidateId,
            CandidateStatus.Rejected,
            { rejectionReason: reason },
            userId,
          );

          expect(result.success).toBe(false);
          if (!result.success) {
            expect(result.error.code).toBe(StateMachineErrorCode.PREREQUISITE_FAILED);
            expect(result.error.message).toContain('rejection reason');
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it('rejection with too-long reason (501+ chars) FAILS with PREREQUISITE_FAILED', async () => {
    /**
     * **Validates: Requirements 10.6, 9.3, 9.4**
     *
     * For any candidate in a non-terminal status and any rejection reason
     * longer than 500 characters, the transition must be rejected.
     */
    await fc.assert(
      fc.asyncProperty(
        candidateIdArb,
        userIdArb,
        nonTerminalStatusArb,
        tooLongReasonArb,
        async (candidateId, userId, currentStatus, reason) => {
          mockPrisma.$transaction.mockImplementation(async (fn: any) => {
            const tx = {
              $queryRaw: vi.fn().mockResolvedValue([{ id: candidateId, status: currentStatus }]),
              candidate: { update: vi.fn() },
              document: { findFirst: vi.fn() },
              timelineEvent: { create: vi.fn() },
            };
            return fn(tx);
          });

          const result = await service.executeTransition(
            candidateId,
            CandidateStatus.Rejected,
            { rejectionReason: reason },
            userId,
          );

          expect(result.success).toBe(false);
          if (!result.success) {
            expect(result.error.code).toBe(StateMachineErrorCode.PREREQUISITE_FAILED);
            expect(result.error.message).toContain('rejection reason');
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it('rejection with empty/missing reason FAILS with PREREQUISITE_FAILED', async () => {
    /**
     * **Validates: Requirements 10.6, 9.3, 9.4**
     *
     * For any candidate in a non-terminal status, attempting a rejection
     * with no reason (empty string, undefined, or null) must fail.
     */
    const emptyReasonArb = fc.constantFrom('', undefined, null);

    await fc.assert(
      fc.asyncProperty(
        candidateIdArb,
        userIdArb,
        nonTerminalStatusArb,
        emptyReasonArb,
        async (candidateId, userId, currentStatus, reason) => {
          mockPrisma.$transaction.mockImplementation(async (fn: any) => {
            const tx = {
              $queryRaw: vi.fn().mockResolvedValue([{ id: candidateId, status: currentStatus }]),
              candidate: { update: vi.fn() },
              document: { findFirst: vi.fn() },
              timelineEvent: { create: vi.fn() },
            };
            return fn(tx);
          });

          const result = await service.executeTransition(
            candidateId,
            CandidateStatus.Rejected,
            { rejectionReason: reason as any },
            userId,
          );

          expect(result.success).toBe(false);
          if (!result.success) {
            expect(result.error.code).toBe(StateMachineErrorCode.PREREQUISITE_FAILED);
            expect(result.error.message).toContain('rejection reason');
          }
        },
      ),
      { numRuns: 50 },
    );
  });

  it('candidate update is NOT called when rejection reason is invalid', async () => {
    /**
     * **Validates: Requirements 10.6, 9.3, 9.4**
     *
     * When rejection fails due to invalid reason length, the candidate
     * record must NOT be modified (status remains unchanged).
     */
    const invalidReasonArb = fc.oneof(
      tooShortReasonArb,
      tooLongReasonArb,
      fc.constant(''),
    );

    await fc.assert(
      fc.asyncProperty(
        candidateIdArb,
        userIdArb,
        nonTerminalStatusArb,
        invalidReasonArb,
        async (candidateId, userId, currentStatus, reason) => {
          const updateMock = vi.fn();

          mockPrisma.$transaction.mockImplementation(async (fn: any) => {
            const tx = {
              $queryRaw: vi.fn().mockResolvedValue([{ id: candidateId, status: currentStatus }]),
              candidate: { update: updateMock },
              document: { findFirst: vi.fn() },
              timelineEvent: { create: vi.fn() },
            };
            return fn(tx);
          });

          await service.executeTransition(
            candidateId,
            CandidateStatus.Rejected,
            { rejectionReason: reason },
            userId,
          );

          // candidate.update should NOT have been called
          expect(updateMock).not.toHaveBeenCalled();
        },
      ),
      { numRuns: 100 },
    );
  });
});
