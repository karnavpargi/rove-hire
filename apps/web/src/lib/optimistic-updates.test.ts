import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { CandidateStatus } from '@rove-hire/shared';
import {
  registerOptimisticUpdate,
  getOptimisticStatus,
  hasPendingUpdate,
  resolveDisplayStatus,
  subscribeToOptimisticUpdates,
  clearAllPendingUpdates,
} from './optimistic-updates';

describe('optimistic-updates', () => {
  beforeEach(() => {
    clearAllPendingUpdates();
  });

  describe('registerOptimisticUpdate', () => {
    it('registers an optimistic update and returns confirm/rollback', () => {
      const result = registerOptimisticUpdate(
        'candidate-1',
        CandidateStatus.InterviewScheduled,
        CandidateStatus.OfferSent,
      );

      expect(result.previousStatus).toBe(CandidateStatus.InterviewScheduled);
      expect(typeof result.confirm).toBe('function');
      expect(typeof result.rollback).toBe('function');
    });

    it('makes the optimistic status available immediately', () => {
      registerOptimisticUpdate(
        'candidate-1',
        CandidateStatus.Applied,
        CandidateStatus.FormSubmitted,
      );

      expect(getOptimisticStatus('candidate-1')).toBe(CandidateStatus.FormSubmitted);
    });
  });

  describe('confirm', () => {
    it('removes the pending update on confirm', () => {
      const { confirm } = registerOptimisticUpdate(
        'candidate-1',
        CandidateStatus.Applied,
        CandidateStatus.FormSubmitted,
      );

      expect(hasPendingUpdate('candidate-1')).toBe(true);
      confirm();
      expect(hasPendingUpdate('candidate-1')).toBe(false);
      expect(getOptimisticStatus('candidate-1')).toBeUndefined();
    });
  });

  describe('rollback', () => {
    it('removes the pending update and returns previous status', () => {
      const { rollback } = registerOptimisticUpdate(
        'candidate-1',
        CandidateStatus.InterviewScheduled,
        CandidateStatus.OfferSent,
      );

      const previousStatus = rollback();
      expect(previousStatus).toBe(CandidateStatus.InterviewScheduled);
      expect(hasPendingUpdate('candidate-1')).toBe(false);
    });
  });

  describe('getOptimisticStatus', () => {
    it('returns undefined for unknown candidate', () => {
      expect(getOptimisticStatus('unknown-id')).toBeUndefined();
    });

    it('auto-expires after 10 seconds', () => {
      vi.useFakeTimers();

      registerOptimisticUpdate(
        'candidate-1',
        CandidateStatus.Applied,
        CandidateStatus.FormSubmitted,
      );

      expect(getOptimisticStatus('candidate-1')).toBe(CandidateStatus.FormSubmitted);

      vi.advanceTimersByTime(10_001);

      expect(getOptimisticStatus('candidate-1')).toBeUndefined();

      vi.useRealTimers();
    });
  });

  describe('hasPendingUpdate', () => {
    it('returns false when no pending update', () => {
      expect(hasPendingUpdate('nonexistent')).toBe(false);
    });

    it('returns true when update is pending', () => {
      registerOptimisticUpdate(
        'candidate-1',
        CandidateStatus.Applied,
        CandidateStatus.FormSubmitted,
      );
      expect(hasPendingUpdate('candidate-1')).toBe(true);
    });

    it('returns false after expiry', () => {
      vi.useFakeTimers();

      registerOptimisticUpdate(
        'candidate-1',
        CandidateStatus.Applied,
        CandidateStatus.FormSubmitted,
      );

      vi.advanceTimersByTime(10_001);
      expect(hasPendingUpdate('candidate-1')).toBe(false);

      vi.useRealTimers();
    });
  });

  describe('resolveDisplayStatus', () => {
    it('returns optimistic status when pending', () => {
      registerOptimisticUpdate(
        'candidate-1',
        CandidateStatus.Applied,
        CandidateStatus.FormSubmitted,
      );

      const display = resolveDisplayStatus('candidate-1', CandidateStatus.Applied);
      expect(display).toBe(CandidateStatus.FormSubmitted);
    });

    it('returns actual status when no pending update', () => {
      const display = resolveDisplayStatus('candidate-1', CandidateStatus.Applied);
      expect(display).toBe(CandidateStatus.Applied);
    });
  });

  describe('subscribeToOptimisticUpdates', () => {
    it('notifies listeners on register', () => {
      const listener = vi.fn();
      const unsubscribe = subscribeToOptimisticUpdates(listener);

      registerOptimisticUpdate(
        'candidate-1',
        CandidateStatus.Applied,
        CandidateStatus.FormSubmitted,
      );

      expect(listener).toHaveBeenCalledWith('candidate-1', CandidateStatus.FormSubmitted);
      unsubscribe();
    });

    it('notifies listeners on confirm', () => {
      const listener = vi.fn();
      const unsubscribe = subscribeToOptimisticUpdates(listener);

      const { confirm } = registerOptimisticUpdate(
        'candidate-1',
        CandidateStatus.Applied,
        CandidateStatus.FormSubmitted,
      );

      listener.mockClear();
      confirm();

      expect(listener).toHaveBeenCalledWith('candidate-1', null);
      unsubscribe();
    });

    it('notifies listeners on rollback with previous status', () => {
      const listener = vi.fn();
      const unsubscribe = subscribeToOptimisticUpdates(listener);

      const { rollback } = registerOptimisticUpdate(
        'candidate-1',
        CandidateStatus.Applied,
        CandidateStatus.FormSubmitted,
      );

      listener.mockClear();
      rollback();

      expect(listener).toHaveBeenCalledWith('candidate-1', CandidateStatus.Applied);
      unsubscribe();
    });

    it('stops notifying after unsubscribe', () => {
      const listener = vi.fn();
      const unsubscribe = subscribeToOptimisticUpdates(listener);
      unsubscribe();

      registerOptimisticUpdate(
        'candidate-1',
        CandidateStatus.Applied,
        CandidateStatus.FormSubmitted,
      );

      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe('clearAllPendingUpdates', () => {
    it('removes all pending updates', () => {
      registerOptimisticUpdate('c1', CandidateStatus.Applied, CandidateStatus.FormSubmitted);
      registerOptimisticUpdate(
        'c2',
        CandidateStatus.FormSubmitted,
        CandidateStatus.InterviewScheduled,
      );

      expect(hasPendingUpdate('c1')).toBe(true);
      expect(hasPendingUpdate('c2')).toBe(true);

      clearAllPendingUpdates();

      expect(hasPendingUpdate('c1')).toBe(false);
      expect(hasPendingUpdate('c2')).toBe(false);
    });
  });
});
