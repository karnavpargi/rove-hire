import type { TimelineEventType } from '@rove-hire/shared';

/**
 * Input DTO for logging a timeline event.
 */
export interface LogEventInput {
  /** The candidate this event belongs to */
  candidateId: string;

  /** The type of timeline event */
  eventType: TimelineEventType;

  /** The candidate's previous status (for status_change events) */
  previousStatus?: string;

  /** The candidate's new status (for status_change events) */
  newStatus?: string;

  /** Free-text details or JSON string with metadata about the event */
  details?: string;

  /** The HR user who performed the action (null for system-initiated events) */
  actorId?: string;
}
