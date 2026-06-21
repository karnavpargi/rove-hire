import { CandidateStatus } from '@rove-hire/shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PrismaService } from '../../prisma/prisma.service';
import {
  createPrismaConflictError,
  type MockPrismaTransaction,
  type TransactionCallback,
} from '../../test-utils/mock-types';
import { StateMachineErrorCode, StateMachineService } from './state-machine.service';

/**
 * Unit tests for StateMachineService.
 * Tests validateTransition, getValidTransitions, and executeTransition.
 */
describe('StateMachineService', () => {
  let service: StateMachineService;
  let mockPrisma: MockPrismaTransaction;

  beforeEach(() => {
    mockPrisma = {
      $transaction: vi.fn(),
    };
    service = new StateMachineService(mockPrisma as unknown as PrismaService);
  });

  describe('validateTransition', () => {
    it('should allow Applied → FormSubmitted', () => {
      expect(
        service.validateTransition(CandidateStatus.Applied, CandidateStatus.FormSubmitted),
      ).toBe(true);
    });

    it('should allow FormSubmitted → InterviewScheduled', () => {
      expect(
        service.validateTransition(
          CandidateStatus.FormSubmitted,
          CandidateStatus.InterviewScheduled,
        ),
      ).toBe(true);
    });

    it('should allow InterviewScheduled → OfferSent', () => {
      expect(
        service.validateTransition(CandidateStatus.InterviewScheduled, CandidateStatus.OfferSent),
      ).toBe(true);
    });

    it('should allow OfferSent → Hired', () => {
      expect(service.validateTransition(CandidateStatus.OfferSent, CandidateStatus.Hired)).toBe(
        true,
      );
    });

    it('should allow any non-terminal → Rejected', () => {
      expect(service.validateTransition(CandidateStatus.Applied, CandidateStatus.Rejected)).toBe(
        true,
      );
      expect(
        service.validateTransition(CandidateStatus.FormSubmitted, CandidateStatus.Rejected),
      ).toBe(true);
      expect(
        service.validateTransition(CandidateStatus.InterviewScheduled, CandidateStatus.Rejected),
      ).toBe(true);
      expect(service.validateTransition(CandidateStatus.OfferSent, CandidateStatus.Rejected)).toBe(
        true,
      );
    });

    it('should reject transitions from terminal statuses', () => {
      expect(service.validateTransition(CandidateStatus.Hired, CandidateStatus.Applied)).toBe(
        false,
      );
      expect(service.validateTransition(CandidateStatus.Hired, CandidateStatus.Rejected)).toBe(
        false,
      );
      expect(service.validateTransition(CandidateStatus.Rejected, CandidateStatus.Applied)).toBe(
        false,
      );
      expect(service.validateTransition(CandidateStatus.Rejected, CandidateStatus.Hired)).toBe(
        false,
      );
    });

    it('should reject skipping states in forward chain', () => {
      expect(
        service.validateTransition(CandidateStatus.Applied, CandidateStatus.InterviewScheduled),
      ).toBe(false);
      expect(service.validateTransition(CandidateStatus.Applied, CandidateStatus.OfferSent)).toBe(
        false,
      );
      expect(service.validateTransition(CandidateStatus.Applied, CandidateStatus.Hired)).toBe(
        false,
      );
      expect(service.validateTransition(CandidateStatus.FormSubmitted, CandidateStatus.Hired)).toBe(
        false,
      );
    });

    it('should reject backward transitions', () => {
      expect(
        service.validateTransition(CandidateStatus.FormSubmitted, CandidateStatus.Applied),
      ).toBe(false);
      expect(
        service.validateTransition(
          CandidateStatus.InterviewScheduled,
          CandidateStatus.FormSubmitted,
        ),
      ).toBe(false);
      expect(
        service.validateTransition(CandidateStatus.OfferSent, CandidateStatus.InterviewScheduled),
      ).toBe(false);
    });
  });

  describe('getValidTransitions', () => {
    it('should return [FormSubmitted, Rejected] for Applied', () => {
      expect(service.getValidTransitions(CandidateStatus.Applied)).toEqual([
        CandidateStatus.FormSubmitted,
        CandidateStatus.Rejected,
      ]);
    });

    it('should return [InterviewScheduled, Rejected] for FormSubmitted', () => {
      expect(service.getValidTransitions(CandidateStatus.FormSubmitted)).toEqual([
        CandidateStatus.InterviewScheduled,
        CandidateStatus.Rejected,
      ]);
    });

    it('should return [OfferSent, Rejected] for InterviewScheduled', () => {
      expect(service.getValidTransitions(CandidateStatus.InterviewScheduled)).toEqual([
        CandidateStatus.OfferSent,
        CandidateStatus.Rejected,
      ]);
    });

    it('should return [Hired, Rejected] for OfferSent', () => {
      expect(service.getValidTransitions(CandidateStatus.OfferSent)).toEqual([
        CandidateStatus.Hired,
        CandidateStatus.Rejected,
      ]);
    });

    it('should return empty array for Hired', () => {
      expect(service.getValidTransitions(CandidateStatus.Hired)).toEqual([]);
    });

    it('should return empty array for Rejected', () => {
      expect(service.getValidTransitions(CandidateStatus.Rejected)).toEqual([]);
    });
  });

  describe('executeTransition', () => {
    const candidateId = 'cand-123';
    const userId = 'user-456';

    it('should return INVALID_TRANSITION error when transition is not allowed', async () => {
      // Mock the transaction to execute the callback
      mockPrisma.$transaction.mockImplementation(async (fn: TransactionCallback) => {
        const tx = {
          $queryRaw: vi.fn().mockResolvedValue([{ id: candidateId, status: 'Hired' }]),
          candidate: { update: vi.fn() },
          document: { findFirst: vi.fn() },
          timelineEvent: { create: vi.fn() },
        };
        return fn(tx);
      });

      const result = await service.executeTransition(
        candidateId,
        CandidateStatus.Applied,
        {},
        userId,
      );

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe(StateMachineErrorCode.INVALID_TRANSITION);
        expect(result.error.currentStatus).toBe(CandidateStatus.Hired);
        expect(result.error.attemptedStatus).toBe(CandidateStatus.Applied);
        expect(result.error.validTransitions).toEqual([]);
      }
    });

    it('should return PREREQUISITE_FAILED when transitioning to Hired without offer doc', async () => {
      mockPrisma.$transaction.mockImplementation(async (fn: TransactionCallback) => {
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
    });

    it('should return PREREQUISITE_FAILED when rejecting without reason', async () => {
      mockPrisma.$transaction.mockImplementation(async (fn: TransactionCallback) => {
        const tx = {
          $queryRaw: vi.fn().mockResolvedValue([{ id: candidateId, status: 'Applied' }]),
          candidate: { update: vi.fn() },
          document: { findFirst: vi.fn() },
          timelineEvent: { create: vi.fn() },
        };
        return fn(tx);
      });

      const result = await service.executeTransition(
        candidateId,
        CandidateStatus.Rejected,
        {},
        userId,
      );

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe(StateMachineErrorCode.PREREQUISITE_FAILED);
        expect(result.error.message).toContain('rejection reason');
      }
    });

    it('should return PREREQUISITE_FAILED when rejection reason is too short', async () => {
      mockPrisma.$transaction.mockImplementation(async (fn: TransactionCallback) => {
        const tx = {
          $queryRaw: vi.fn().mockResolvedValue([{ id: candidateId, status: 'Applied' }]),
          candidate: { update: vi.fn() },
          document: { findFirst: vi.fn() },
          timelineEvent: { create: vi.fn() },
        };
        return fn(tx);
      });

      const result = await service.executeTransition(
        candidateId,
        CandidateStatus.Rejected,
        { rejectionReason: 'no' },
        userId,
      );

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe(StateMachineErrorCode.PREREQUISITE_FAILED);
        expect(result.error.message).toContain('5 and 500 characters');
      }
    });

    it('should return PREREQUISITE_FAILED when rejection reason is too long', async () => {
      mockPrisma.$transaction.mockImplementation(async (fn: TransactionCallback) => {
        const tx = {
          $queryRaw: vi.fn().mockResolvedValue([{ id: candidateId, status: 'Applied' }]),
          candidate: { update: vi.fn() },
          document: { findFirst: vi.fn() },
          timelineEvent: { create: vi.fn() },
        };
        return fn(tx);
      });

      const result = await service.executeTransition(
        candidateId,
        CandidateStatus.Rejected,
        { rejectionReason: 'x'.repeat(501) },
        userId,
      );

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe(StateMachineErrorCode.PREREQUISITE_FAILED);
        expect(result.error.message).toContain('5 and 500 characters');
      }
    });

    it('should successfully transition Applied → FormSubmitted', async () => {
      const updatedCandidate = {
        id: candidateId,
        status: CandidateStatus.FormSubmitted,
        lastActivityAt: new Date(),
      };

      mockPrisma.$transaction.mockImplementation(async (fn: TransactionCallback) => {
        const tx = {
          $queryRaw: vi.fn().mockResolvedValue([{ id: candidateId, status: 'Applied' }]),
          candidate: { update: vi.fn().mockResolvedValue(updatedCandidate) },
          document: { findFirst: vi.fn() },
          timelineEvent: { create: vi.fn().mockResolvedValue({}) },
        };
        return fn(tx);
      });

      const result = await service.executeTransition(
        candidateId,
        CandidateStatus.FormSubmitted,
        {},
        userId,
      );

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.candidate.status).toBe(CandidateStatus.FormSubmitted);
      }
    });

    it('should successfully transition to Hired when offer doc exists', async () => {
      const updatedCandidate = {
        id: candidateId,
        status: CandidateStatus.Hired,
        lastActivityAt: new Date(),
      };

      mockPrisma.$transaction.mockImplementation(async (fn: TransactionCallback) => {
        const tx = {
          $queryRaw: vi.fn().mockResolvedValue([{ id: candidateId, status: 'OfferSent' }]),
          candidate: { update: vi.fn().mockResolvedValue(updatedCandidate) },
          document: { findFirst: vi.fn().mockResolvedValue({ id: 'doc-1', type: 'OfferLetter' }) },
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
    });

    it('should successfully reject with valid reason', async () => {
      const updatedCandidate = {
        id: candidateId,
        status: CandidateStatus.Rejected,
        rejectionReason: 'Not a good fit for the team culture',
        lastActivityAt: new Date(),
      };

      mockPrisma.$transaction.mockImplementation(async (fn: TransactionCallback) => {
        const tx = {
          $queryRaw: vi.fn().mockResolvedValue([{ id: candidateId, status: 'InterviewScheduled' }]),
          candidate: { update: vi.fn().mockResolvedValue(updatedCandidate) },
          document: { findFirst: vi.fn() },
          timelineEvent: { create: vi.fn().mockResolvedValue({}) },
        };
        return fn(tx);
      });

      const result = await service.executeTransition(
        candidateId,
        CandidateStatus.Rejected,
        { rejectionReason: 'Not a good fit for the team culture' },
        userId,
      );

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.candidate.status).toBe(CandidateStatus.Rejected);
      }
    });

    it('should return PREREQUISITE_FAILED when candidate not found', async () => {
      mockPrisma.$transaction.mockImplementation(async (fn: TransactionCallback) => {
        const tx = {
          $queryRaw: vi.fn().mockResolvedValue([]),
          candidate: { update: vi.fn() },
          document: { findFirst: vi.fn() },
          timelineEvent: { create: vi.fn() },
        };
        return fn(tx);
      });

      const result = await service.executeTransition(
        candidateId,
        CandidateStatus.FormSubmitted,
        {},
        userId,
      );

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe(StateMachineErrorCode.PREREQUISITE_FAILED);
        expect(result.error.message).toContain('not found');
      }
    });

    it('should return CONFLICT_ERROR on Prisma write conflict', async () => {
      const conflictError = createPrismaConflictError('Write conflict');
      mockPrisma.$transaction.mockRejectedValue(conflictError);

      const result = await service.executeTransition(
        candidateId,
        CandidateStatus.FormSubmitted,
        {},
        userId,
      );

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe(StateMachineErrorCode.CONFLICT_ERROR);
        expect(result.error.message).toContain('modified by another process');
      }
    });

    it('should verify timeline event is created with correct data on transition', async () => {
      const timelineCreateMock = vi.fn().mockResolvedValue({});
      const updatedCandidate = {
        id: candidateId,
        status: CandidateStatus.FormSubmitted,
        lastActivityAt: new Date(),
      };

      mockPrisma.$transaction.mockImplementation(async (fn: TransactionCallback) => {
        const tx = {
          $queryRaw: vi.fn().mockResolvedValue([{ id: candidateId, status: 'Applied' }]),
          candidate: { update: vi.fn().mockResolvedValue(updatedCandidate) },
          document: { findFirst: vi.fn() },
          timelineEvent: { create: timelineCreateMock },
        };
        return fn(tx);
      });

      await service.executeTransition(candidateId, CandidateStatus.FormSubmitted, {}, userId);

      expect(timelineCreateMock).toHaveBeenCalledWith({
        data: {
          candidateId,
          eventType: 'status_change',
          previousStatus: CandidateStatus.Applied,
          newStatus: CandidateStatus.FormSubmitted,
          details: null,
          actorId: userId,
        },
      });
    });

    it('should store rejection reason in timeline details', async () => {
      const timelineCreateMock = vi.fn().mockResolvedValue({});
      const rejectionReason = 'Position filled by another candidate';
      const updatedCandidate = {
        id: candidateId,
        status: CandidateStatus.Rejected,
        rejectionReason,
        lastActivityAt: new Date(),
      };

      mockPrisma.$transaction.mockImplementation(async (fn: TransactionCallback) => {
        const tx = {
          $queryRaw: vi.fn().mockResolvedValue([{ id: candidateId, status: 'OfferSent' }]),
          candidate: { update: vi.fn().mockResolvedValue(updatedCandidate) },
          document: { findFirst: vi.fn() },
          timelineEvent: { create: timelineCreateMock },
        };
        return fn(tx);
      });

      await service.executeTransition(
        candidateId,
        CandidateStatus.Rejected,
        { rejectionReason },
        userId,
      );

      expect(timelineCreateMock).toHaveBeenCalledWith({
        data: expect.objectContaining({
          eventType: 'status_change',
          previousStatus: CandidateStatus.OfferSent,
          newStatus: CandidateStatus.Rejected,
          details: rejectionReason,
          actorId: userId,
        }),
      });
    });
  });
});
