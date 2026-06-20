/**
 * Candidate-related types shared between frontend and backend.
 */

/** Valid candidate pipeline statuses (PascalCase to match Prisma enum) */
export enum CandidateStatus {
  Applied = 'Applied',
  FormSubmitted = 'FormSubmitted',
  InterviewScheduled = 'InterviewScheduled',
  OfferSent = 'OfferSent',
  Hired = 'Hired',
  Rejected = 'Rejected',
}

/** Terminal statuses that cannot transition to other states */
export type TerminalStatus = CandidateStatus.Hired | CandidateStatus.Rejected;

/** Non-terminal statuses that can transition forward or to Rejected */
export type NonTerminalStatus = Exclude<CandidateStatus, TerminalStatus>;

/** Core candidate data */
export interface Candidate {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  location?: string | null;
  currentRole?: string | null;
  noticePeriod?: string | null;
  salaryExpectation?: string | null;
  linkedinUrl?: string | null;
  status: CandidateStatus;
  rejectionReason?: string | null;
  jobOpeningId: string;
  lastActivityAt: string;
  createdAt: string;
  updatedAt: string;
}

/** Input for creating a new candidate */
export interface CreateCandidateInput {
  name: string;
  email: string;
  phone?: string | null;
  jobOpeningId: string;
}

/** Input for the public application form submitted via magic link */
export interface ApplicationFormInput {
  phone?: string | null;
  location?: string | null;
  currentRole?: string | null;
  noticePeriod?: string | null;
  salaryExpectation?: string | null;
  linkedinUrl?: string | null;
}

/** Filters for querying candidates */
export interface CandidateFilters {
  page?: number;
  pageSize?: number;
  statuses?: CandidateStatus[];
  search?: string;
  jobOpeningId?: string;
  sortBy?: 'lastActivity';
  sortOrder?: 'asc' | 'desc';
}

/** Metadata required for a status transition */
export interface TransitionMeta {
  rejectionReason?: string;
}

/** Input for transitioning a candidate's status via GraphQL mutation */
export interface TransitionStatusInput {
  candidateId: string;
  targetStatus: CandidateStatus;
  rejectionReason?: string;
}
