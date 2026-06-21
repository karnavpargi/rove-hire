/**
 * Property 2: State Machine — Invalid Transitions Rejected with Structured Error
 *
 * For any (status, target) pair NOT in the valid transitions set,
 * the system shall reject the transition and return a structured error
 * containing the current status, attempted status, and list of valid transitions.
 *
 * Invalid transitions include:
 * - Backward transitions (e.g., FormSubmitted → Applied)
 * - Skipping states (e.g., Applied → InterviewScheduled)
 * - Transitions from terminal states (Hired, Rejected)
 * - Self-transitions (e.g., Applied → Applied)
 *
 * **Validates: Requirements 10.3, 10.7, 9.6**
 */

import { CandidateStatus, VALID_TRANSITIONS, getValidTransitions } from '@rove-hire/shared';
import * as fc from 'fast-check';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PrismaService } from '../../prisma/prisma.service';
import { type MockPrismaTransaction, type TransactionCallback } from '../../test-utils/mock-types';
import { StateMachineErrorCode, StateMachineService } from './state-machine.service';

const ALL_STATUSES = Object.values(CandidateStatus);

/**
 * Compute the complete set of INVALID (status, target) pairs.
 * A pair is invalid if target is NOT in VALID_TRANSITIONS[status].
 */
function getInvalidPairs(): Array<{ current: CandidateStatus; target: CandidateStatus }> {
  const invalidPairs: Array<{ current: CandidateStatus; target: CandidateStatus }> = [];

  for (const current of ALL_STATUSES) {
    const validTargets = VALID_TRANSITIONS[current] ?? [];
    for (const target of ALL_STATUSES) {
      if (!validTargets.includes(target)) {
        invalidPairs.push({ current, target });
      }
    }
  }

  return invalidPairs;
}

/**
 * Arbitrary that generates only invalid (current, target) status pairs.
 */
const invalidTransitionArb = fc.constantFrom(...getInvalidPairs());

describe('Property 2: State Machine — Invalid Transitions Rejected with Structured Error', () => {
  let service: StateMachineService;
  let mockPrisma: MockPrismaTransaction;

  beforeEach(() => {
    mockPrisma = {
      $transaction: vi.fn(),
    };
    service = new StateMachineService(mockPrisma as unknown as PrismaService);
  });

  it('validateTransition rejects all invalid (status, target) pairs', () => {
    fc.assert(
      fc.property(invalidTransitionArb, ({ current, target }) => {
        const result = service.validateTransition(current, target);
        expect(result).toBe(false);
      }),
      { numRuns: 200 },
    );
  });

  it('executeTransition returns INVALID_TRANSITION error with structured details for all invalid pairs', () => {
    fc.assert(
      fc.asyncProperty(invalidTransitionArb, async ({ current, target }) => {
        const candidateId = 'test-candidate-id';
        const userId = 'test-user-id';

        // Mock the transaction to return a candidate with the given current status
        mockPrisma.$transaction.mockImplementation(async (fn: TransactionCallback) => {
          const tx = {
            $queryRaw: vi.fn().mockResolvedValue([{ id: candidateId, status: current }]),
            candidate: { update: vi.fn() },
            document: { findFirst: vi.fn() },
            timelineEvent: { create: vi.fn() },
          };
          return fn(tx);
        });

        const result = await service.executeTransition(candidateId, target, {}, userId);

        // The transition must be rejected
        expect(result.success).toBe(false);

        if (!result.success) {
          // Error must have INVALID_TRANSITION code
          expect(result.error.code).toBe(StateMachineErrorCode.INVALID_TRANSITION);

          // Error must contain the current status
          expect(result.error.currentStatus).toBe(current);

          // Error must contain the attempted target status
          expect(result.error.attemptedStatus).toBe(target);

          // Error must contain the valid transitions list
          const expectedValidTransitions = getValidTransitions(current);
          expect(result.error.validTransitions).toEqual(expectedValidTransitions);
        }
      }),
      { numRuns: 200 },
    );
  });

  it('terminal statuses (Hired, Rejected) reject ALL target statuses with empty valid transitions list', () => {
    const terminalStatuses = [CandidateStatus.Hired, CandidateStatus.Rejected];
    const targetStatusArb = fc.constantFrom(...ALL_STATUSES);
    const terminalStatusArb = fc.constantFrom(...terminalStatuses);

    fc.assert(
      fc.asyncProperty(terminalStatusArb, targetStatusArb, async (terminalStatus, target) => {
        const candidateId = 'test-candidate-terminal';
        const userId = 'test-user-id';

        mockPrisma.$transaction.mockImplementation(async (fn: TransactionCallback) => {
          const tx = {
            $queryRaw: vi.fn().mockResolvedValue([{ id: candidateId, status: terminalStatus }]),
            candidate: { update: vi.fn() },
            document: { findFirst: vi.fn() },
            timelineEvent: { create: vi.fn() },
          };
          return fn(tx);
        });

        const result = await service.executeTransition(candidateId, target, {}, userId);

        // ALL transitions from terminal statuses must be rejected
        expect(result.success).toBe(false);

        if (!result.success) {
          expect(result.error.code).toBe(StateMachineErrorCode.INVALID_TRANSITION);
          expect(result.error.currentStatus).toBe(terminalStatus);
          expect(result.error.attemptedStatus).toBe(target);
          // Terminal statuses have no valid transitions
          expect(result.error.validTransitions).toEqual([]);
        }
      }),
      { numRuns: 100 },
    );
  });
});
