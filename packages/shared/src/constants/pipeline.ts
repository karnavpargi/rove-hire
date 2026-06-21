import { CandidateStatus } from '../types/candidate';

/**
 * Valid forward transitions in the candidate pipeline state machine.
 * Transition from any non-terminal status to Rejected is always allowed.
 */
export const VALID_FORWARD_TRANSITIONS: Record<CandidateStatus, CandidateStatus[]> = {
  [CandidateStatus.Applied]: [CandidateStatus.FormSubmitted],
  [CandidateStatus.FormSubmitted]: [CandidateStatus.InterviewScheduled],
  [CandidateStatus.InterviewScheduled]: [CandidateStatus.OfferSent],
  [CandidateStatus.OfferSent]: [CandidateStatus.Hired],
  [CandidateStatus.Hired]: [],
  [CandidateStatus.Rejected]: [],
};

/**
 * Complete state machine transition map.
 * Each key maps to all valid target statuses (forward + Rejected for non-terminal states).
 *
 * Applied → FormSubmitted, Rejected
 * FormSubmitted → InterviewScheduled, Rejected
 * InterviewScheduled → OfferSent, Rejected
 * OfferSent → Hired, Rejected
 * Hired → [] (terminal)
 * Rejected → [] (terminal)
 */
export const VALID_TRANSITIONS: Record<CandidateStatus, CandidateStatus[]> = {
  [CandidateStatus.Applied]: [CandidateStatus.FormSubmitted, CandidateStatus.Rejected],
  [CandidateStatus.FormSubmitted]: [CandidateStatus.InterviewScheduled, CandidateStatus.Rejected],
  [CandidateStatus.InterviewScheduled]: [CandidateStatus.OfferSent, CandidateStatus.Rejected],
  [CandidateStatus.OfferSent]: [CandidateStatus.Hired, CandidateStatus.Rejected],
  [CandidateStatus.Hired]: [],
  [CandidateStatus.Rejected]: [],
};

/** Statuses from which a candidate can be rejected */
export const REJECTABLE_STATUSES: CandidateStatus[] = [
  CandidateStatus.Applied,
  CandidateStatus.FormSubmitted,
  CandidateStatus.InterviewScheduled,
  CandidateStatus.OfferSent,
];

/** Terminal statuses — no further transitions allowed */
export const TERMINAL_STATUSES: CandidateStatus[] = [
  CandidateStatus.Hired,
  CandidateStatus.Rejected,
];

/**
 * Returns the list of valid target statuses that a candidate can transition to
 * from the given current status.
 */
export function getValidTransitions(status: CandidateStatus): CandidateStatus[] {
  return VALID_TRANSITIONS[status] ?? [];
}

/**
 * Checks whether transitioning from one status to another is valid
 * according to the state machine rules.
 */
export function isValidTransition(from: CandidateStatus, to: CandidateStatus): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

/**
 * Alias for VALID_TRANSITIONS — the complete state machine transition map.
 * Exported for consumers that prefer the STATE_TRANSITIONS naming convention.
 */
export const STATE_TRANSITIONS = VALID_TRANSITIONS;

/**
 * Returns true if the given status is terminal (Hired or Rejected),
 * meaning no further transitions are allowed.
 */
export function isTerminalStatus(status: CandidateStatus): boolean {
  return TERMINAL_STATUSES.includes(status);
}
