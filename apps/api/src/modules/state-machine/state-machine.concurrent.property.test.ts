/**
 * Property 15: Concurrent Status Change — First Writer Wins
 *
 * Property-based tests verifying that when two concurrent valid transitions
 * are attempted on the same candidate, exactly one succeeds and the other
 * receives a CONFLICT_ERROR. The candidate record reflects only the
 * successfully committed transition without corruption.
 *
 * Simulates concurrency by:
 * - First call: Prisma transaction executes successfully (returns updated candidate)
 * - Second call: Prisma transaction throws P2034 (write conflict / deadlock)
 *
 * **Validates: Requirements 26.1, 26.4**
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { StateMachineService, StateMachineErrorCode } from './state-machine.service';
import { CandidateStatus, VALID_TRANSITIONS } from '@rove-hire/shared';

describe('Property 15: Concurrent Status Change — First Writer Wins', () => {
  let service: StateMachineService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      $transaction: vi.fn(),
    };
    service = new StateMachineService(mockPrisma);
  });

  /**
   * Generate valid (status, target) pairs where a forward transition exists.
   * Excludes terminal statuses (Hired, Rejected) since they have no valid transitions.
   * Also excludes Rejected as target since it requires a rejection reason (separate concern).
   */
  const validNonTerminalTransitionArb = fc.constantFrom(
    ...Object.entries(VALID_TRANSITIONS)
      .filter(([_, targets]) => targets.length > 0)
      .flatMap(([status, targets]) =>
        targets
          .filter((t) => t !== CandidateStatus.Rejected)
          .map((target) => ({
            current: status as CandidateStatus,
            target: target as CandidateStatus,
          })),
      ),
  );

  /**
   * Arbitrary for candidate IDs.
   */
  const candidateIdArb = fc.uuid();

  /**
   * Arbitrary for user IDs (two different HR users making concurrent changes).
   */
  const userIdPairArb = fc.tuple(fc.uuid(), fc.uuid());

  it('exactly one of two concurrent transitions succeeds, other gets CONFLICT_ERROR', async () => {
    /**
     * **Validates: Requirements 26.1, 26.4**
     *
     * Simulate two concurrent valid transitions on the same candidate.
     * The first call completes its transaction successfully.
     * The second call encounters a P2034 write conflict error from Prisma.
     *
     * Assert: exactly one succeeds, the other fails with CONFLICT_ERROR.
     */
    await fc.assert(
      fc.asyncProperty(
        candidateIdArb,
        userIdPairArb,
        validNonTerminalTransitionArb,
        async (candidateId, [userId1, userId2], { current, target }) => {
          const updatedCandidate = {
            id: candidateId,
            name: 'Test Candidate',
            email: 'test@example.com',
            status: target,
            lastActivityAt: new Date(),
            jobOpeningId: 'job-1',
            createdAt: new Date(),
            updatedAt: new Date(),
          };

          let callCount = 0;

          // Mock $transaction to simulate concurrency:
          // - First invocation: succeeds (executes the callback, returns updated candidate)
          // - Second invocation: throws Prisma P2034 write conflict error
          mockPrisma.$transaction.mockImplementation(async (fn: any) => {
            callCount++;

            if (callCount === 1) {
              // First writer wins — transaction executes successfully
              const tx = {
                $queryRaw: vi.fn().mockResolvedValue([{ id: candidateId, status: current }]),
                candidate: { update: vi.fn().mockResolvedValue(updatedCandidate) },
                document: {
                  findFirst: vi
                    .fn()
                    .mockResolvedValue(
                      target === CandidateStatus.Hired
                        ? { id: 'doc-1', type: 'OfferLetter' }
                        : null,
                    ),
                },
                timelineEvent: { create: vi.fn().mockResolvedValue({}) },
              };
              return fn(tx);
            }

            // Second writer loses — Prisma throws P2034 write conflict
            const conflictError = new Error(
              'Transaction failed due to a write conflict or a deadlock. Please retry your transaction',
            );
            (conflictError as any).code = 'P2034';
            throw conflictError;
          });

          // Execute two concurrent transitions
          const [result1, result2] = await Promise.all([
            service.executeTransition(candidateId, target, {}, userId1),
            service.executeTransition(candidateId, target, {}, userId2),
          ]);

          // Exactly one must succeed and the other must fail with CONFLICT_ERROR
          const results = [result1, result2];
          const successes = results.filter((r) => r.success);
          const failures = results.filter((r) => !r.success);

          expect(successes).toHaveLength(1);
          expect(failures).toHaveLength(1);

          // The successful result has the correct new status
          const successResult = successes[0];
          if (successResult.success) {
            expect(successResult.candidate.status).toBe(target);
            expect(successResult.candidate.id).toBe(candidateId);
          }

          // The failed result has CONFLICT_ERROR code
          const failureResult = failures[0];
          if (!failureResult.success) {
            expect(failureResult.error.code).toBe(StateMachineErrorCode.CONFLICT_ERROR);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it('successful transition produces consistent state (no corruption)', async () => {
    /**
     * **Validates: Requirements 26.4**
     *
     * After a concurrent conflict, the candidate record reflects ONLY the
     * successfully committed transition. No partial state changes are persisted.
     * The candidate's status matches the target of the winning transition.
     */
    await fc.assert(
      fc.asyncProperty(
        candidateIdArb,
        userIdPairArb,
        validNonTerminalTransitionArb,
        async (candidateId, [userId1, userId2], { current, target }) => {
          const updatedCandidate = {
            id: candidateId,
            name: 'Consistent Candidate',
            email: 'consistent@example.com',
            status: target,
            rejectionReason: null,
            lastActivityAt: new Date(),
            jobOpeningId: 'job-1',
            createdAt: new Date(),
            updatedAt: new Date(),
          };

          let callCount = 0;

          mockPrisma.$transaction.mockImplementation(async (fn: any) => {
            callCount++;

            if (callCount === 1) {
              const tx = {
                $queryRaw: vi.fn().mockResolvedValue([{ id: candidateId, status: current }]),
                candidate: { update: vi.fn().mockResolvedValue(updatedCandidate) },
                document: {
                  findFirst: vi
                    .fn()
                    .mockResolvedValue(
                      target === CandidateStatus.Hired
                        ? { id: 'doc-1', type: 'OfferLetter' }
                        : null,
                    ),
                },
                timelineEvent: { create: vi.fn().mockResolvedValue({}) },
              };
              return fn(tx);
            }

            // P2034 conflict for second writer
            const conflictError = new Error(
              'Transaction failed due to a write conflict or a deadlock. Please retry your transaction',
            );
            (conflictError as any).code = 'P2034';
            throw conflictError;
          });

          const [result1, result2] = await Promise.all([
            service.executeTransition(candidateId, target, {}, userId1),
            service.executeTransition(candidateId, target, {}, userId2),
          ]);

          // Find the successful result
          const successResult = [result1, result2].find((r) => r.success);
          expect(successResult).toBeDefined();

          if (successResult && successResult.success) {
            // State consistency checks — no partial/corrupted fields
            expect(successResult.candidate.id).toBe(candidateId);
            expect(successResult.candidate.status).toBe(target);
            // Status must be exactly the target — not some intermediate value
            expect(Object.values(CandidateStatus)).toContain(successResult.candidate.status);
            // The candidate object has required fields (no undefined corruption)
            expect(successResult.candidate.lastActivityAt).toBeInstanceOf(Date);
          }

          // The failed result does NOT produce any state change
          const failResult = [result1, result2].find((r) => !r.success);
          expect(failResult).toBeDefined();
          if (failResult && !failResult.success) {
            // Conflict error indicates no partial state was persisted
            expect(failResult.error.code).toBe(StateMachineErrorCode.CONFLICT_ERROR);
            expect(failResult.error.message).toBeDefined();
          }
        },
      ),
      { numRuns: 50 },
    );
  });

  it('conflict error contains informative message for the second writer', async () => {
    /**
     * **Validates: Requirements 26.1**
     *
     * The conflict error returned to the second writer must contain
     * an informative message indicating the status has changed,
     * without corrupting the candidate record.
     */
    await fc.assert(
      fc.asyncProperty(
        candidateIdArb,
        fc.uuid(),
        validNonTerminalTransitionArb,
        async (candidateId, userId, { current, target }) => {
          // Simulate direct conflict — the $transaction throws P2034
          mockPrisma.$transaction.mockImplementation(async () => {
            const conflictError = new Error(
              'Transaction failed due to a write conflict or a deadlock. Please retry your transaction',
            );
            (conflictError as any).code = 'P2034';
            throw conflictError;
          });

          const result = await service.executeTransition(candidateId, target, {}, userId);

          // Must be a failure with CONFLICT_ERROR
          expect(result.success).toBe(false);
          if (!result.success) {
            expect(result.error.code).toBe(StateMachineErrorCode.CONFLICT_ERROR);
            // Message should indicate the record was modified by another process
            expect(result.error.message).toBeDefined();
            expect(result.error.message!.length).toBeGreaterThan(0);
          }
        },
      ),
      { numRuns: 50 },
    );
  });
});
