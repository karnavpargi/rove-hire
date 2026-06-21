/**
 * Optimistic update utilities for candidate status transitions.
 *
 * Strategy: When a user triggers a status change, update the UI immediately
 * (within 100ms) then revert if the server rejects (within 2s).
 *
 * Validates: Requirements 12.5, 12.6
 */

import type { CandidateStatus } from '@rove-hire/shared';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface OptimisticStatusUpdate {
  candidateId: string;
  previousStatus: CandidateStatus;
  targetStatus: CandidateStatus;
  timestamp: number;
}

export interface OptimisticUpdateResult {
  /** Call to confirm the update succeeded (remove from pending) */
  confirm: () => void;
  /** Call to revert the update (server rejected) */
  rollback: () => CandidateStatus;
  /** The previous status before the optimistic update */
  previousStatus: CandidateStatus;
}

// ---------------------------------------------------------------------------
// In-flight Update Tracking
// ---------------------------------------------------------------------------

/** Max time before an optimistic update auto-expires (safety net). */
const MAX_PENDING_MS = 10_000;

/** Map of candidateId → pending optimistic update */
const pendingUpdates = new Map<string, OptimisticStatusUpdate>();

/** Listeners for optimistic state changes (UI reactivity) */
type OptimisticListener = (candidateId: string, status: CandidateStatus | null) => void;
const listeners = new Set<OptimisticListener>();

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Register an optimistic status transition.
 * Returns an object with confirm() and rollback() methods.
 *
 * Usage:
 * ```ts
 * const { confirm, rollback } = registerOptimisticUpdate(id, current, target);
 * try {
 *   await mutate(...);
 *   confirm();
 * } catch (err) {
 *   rollback();
 *   handleError(err);
 * }
 * ```
 */
export function registerOptimisticUpdate(
  candidateId: string,
  previousStatus: CandidateStatus,
  targetStatus: CandidateStatus,
): OptimisticUpdateResult {
  const update: OptimisticStatusUpdate = {
    candidateId,
    previousStatus,
    targetStatus,
    timestamp: Date.now(),
  };

  pendingUpdates.set(candidateId, update);
  notifyListeners(candidateId, targetStatus);

  return {
    confirm: () => {
      pendingUpdates.delete(candidateId);
      notifyListeners(candidateId, null);
    },
    rollback: () => {
      pendingUpdates.delete(candidateId);
      notifyListeners(candidateId, previousStatus);
      return previousStatus;
    },
    previousStatus,
  };
}

/**
 * Get the optimistic status for a candidate if an update is in-flight.
 * Returns undefined if no pending update exists or if it's expired.
 */
export function getOptimisticStatus(candidateId: string): CandidateStatus | undefined {
  const update = pendingUpdates.get(candidateId);
  if (!update) return undefined;

  // Auto-expire stale updates (safety net against stuck states)
  if (Date.now() - update.timestamp > MAX_PENDING_MS) {
    pendingUpdates.delete(candidateId);
    return undefined;
  }

  return update.targetStatus;
}

/**
 * Check if a candidate has a pending optimistic update.
 */
export function hasPendingUpdate(candidateId: string): boolean {
  const update = pendingUpdates.get(candidateId);
  if (!update) return false;

  if (Date.now() - update.timestamp > MAX_PENDING_MS) {
    pendingUpdates.delete(candidateId);
    return false;
  }

  return true;
}

/**
 * Get the resolved status: optimistic (if pending) or actual.
 * Use this in components to display the candidate's current status.
 */
export function resolveDisplayStatus(
  candidateId: string,
  actualStatus: CandidateStatus,
): CandidateStatus {
  return getOptimisticStatus(candidateId) ?? actualStatus;
}

// ---------------------------------------------------------------------------
// Subscription (for React state sync)
// ---------------------------------------------------------------------------

/**
 * Subscribe to optimistic status changes.
 * Returns an unsubscribe function.
 */
export function subscribeToOptimisticUpdates(listener: OptimisticListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function notifyListeners(candidateId: string, status: CandidateStatus | null): void {
  listeners.forEach((listener) => listener(candidateId, status));
}

// ---------------------------------------------------------------------------
// Cleanup
// ---------------------------------------------------------------------------

/**
 * Clear all pending optimistic updates (e.g., on page navigation).
 */
export function clearAllPendingUpdates(): void {
  pendingUpdates.clear();
}
