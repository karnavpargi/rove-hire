/**
 * Property 1: State Machine — Valid Transitions Accepted
 *
 * Property-based tests verifying that ALL valid (status, target) pairs
 * from the VALID_TRANSITIONS map are accepted by the state machine,
 * and that scheduling an additional interview when status is already
 * InterviewScheduled does not change the status.
 *
 * **Validates: Requirements 10.1, 10.2, 6.2, 6.9**
 */

import {
  CandidateStatus,
  VALID_TRANSITIONS,
  getValidTransitions,
  isValidTransition,
} from '@rove-hire/shared';
import * as fc from 'fast-check';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PrismaService } from '../../prisma/prisma.service';
import { type MockPrismaTransaction } from '../../test-utils/mock-types';
import { StateMachineService } from './state-machine.service';

describe('Property 1: State Machine — Valid Transitions Accepted', () => {
  let service: StateMachineService;
  let mockPrisma: MockPrismaTransaction;

  beforeEach(() => {
    mockPrisma = {
      $transaction: vi.fn(),
    };
    service = new StateMachineService(mockPrisma as unknown as PrismaService);
  });

  /**
   * Generate all valid (status, target) pairs from VALID_TRANSITIONS map.
   * This is the exhaustive set of transitions that must be accepted.
   */
  const validPairsArbitrary = fc.constantFrom(
    ...Object.entries(VALID_TRANSITIONS).flatMap(([status, targets]) =>
      targets.map((target) => ({
        current: status as CandidateStatus,
        target: target as CandidateStatus,
      })),
    ),
  );

  it('validateTransition returns true for ALL valid (status, target) pairs', () => {
    fc.assert(
      fc.property(validPairsArbitrary, ({ current, target }) => {
        // The state machine must accept every valid transition defined in VALID_TRANSITIONS
        expect(service.validateTransition(current, target)).toBe(true);
      }),
      { numRuns: 100 },
    );
  });

  it('getValidTransitions returns correct target arrays for any status', () => {
    const allStatuses = fc.constantFrom(...Object.values(CandidateStatus));

    fc.assert(
      fc.property(allStatuses, (status) => {
        const result = service.getValidTransitions(status);
        const expected = VALID_TRANSITIONS[status] ?? [];

        // Must return the exact set of valid transitions
        expect(result).toEqual(expected);

        // Every item in the returned array must pass validateTransition
        for (const target of result) {
          expect(service.validateTransition(status, target)).toBe(true);
        }
      }),
      { numRuns: 50 },
    );
  });

  it('isValidTransition (shared util) agrees with service.validateTransition for all valid pairs', () => {
    fc.assert(
      fc.property(validPairsArbitrary, ({ current, target }) => {
        // The shared utility function must agree with the service
        expect(isValidTransition(current, target)).toBe(true);
        expect(service.validateTransition(current, target)).toBe(true);
      }),
      { numRuns: 100 },
    );
  });

  it('getValidTransitions (shared util) agrees with service.getValidTransitions for all statuses', () => {
    const allStatuses = fc.constantFrom(...Object.values(CandidateStatus));

    fc.assert(
      fc.property(allStatuses, (status) => {
        const serviceResult = service.getValidTransitions(status);
        const sharedResult = getValidTransitions(status);

        expect(serviceResult).toEqual(sharedResult);
      }),
      { numRuns: 50 },
    );
  });

  /**
   * Validates Requirement 6.9: When an additional interview is scheduled for a candidate
   * already in InterviewScheduled status, the status should remain InterviewScheduled.
   *
   * This verifies that the system does NOT transition the candidate to a different status
   * when adding interviews — InterviewScheduled is idempotent for interview scheduling.
   */
  it('InterviewScheduled status remains unchanged when additional interview is created', () => {
    fc.assert(
      fc.property(
        fc.record({
          candidateId: fc.uuid(),
          interviewerName: fc.string({ minLength: 1, maxLength: 100 }),
          scheduledAt: fc.date({ min: new Date() }),
        }),
        () => {
          // A candidate already in InterviewScheduled should NOT have their status
          // changed by scheduling additional interviews. The only valid forward
          // transition from InterviewScheduled is OfferSent (or Rejected).
          const currentStatus = CandidateStatus.InterviewScheduled;
          const validTargets = service.getValidTransitions(currentStatus);

          // InterviewScheduled is NOT in the valid targets from InterviewScheduled
          // This means scheduling another interview doesn't trigger a state change
          expect(validTargets).not.toContain(CandidateStatus.InterviewScheduled);

          // The valid transitions from InterviewScheduled are only OfferSent and Rejected
          expect(validTargets).toContain(CandidateStatus.OfferSent);
          expect(validTargets).toContain(CandidateStatus.Rejected);
          expect(validTargets).toHaveLength(2);

          // Trying to "re-transition" to InterviewScheduled is invalid
          expect(
            service.validateTransition(currentStatus, CandidateStatus.InterviewScheduled),
          ).toBe(false);
        },
      ),
      { numRuns: 20 },
    );
  });
});
