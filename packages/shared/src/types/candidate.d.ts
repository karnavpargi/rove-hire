export declare enum CandidateStatus {
    Applied = "Applied",
    FormSubmitted = "FormSubmitted",
    InterviewScheduled = "InterviewScheduled",
    OfferSent = "OfferSent",
    Hired = "Hired",
    Rejected = "Rejected"
}
export type TerminalStatus = CandidateStatus.Hired | CandidateStatus.Rejected;
export type NonTerminalStatus = Exclude<CandidateStatus, TerminalStatus>;
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
export interface CreateCandidateInput {
    name: string;
    email: string;
    phone?: string | null;
    jobOpeningId: string;
}
export interface ApplicationFormInput {
    phone?: string | null;
    location?: string | null;
    currentRole?: string | null;
    noticePeriod?: string | null;
    salaryExpectation?: string | null;
    linkedinUrl?: string | null;
}
export interface CandidateFilters {
    page?: number;
    pageSize?: number;
    statuses?: CandidateStatus[];
    search?: string;
    jobOpeningId?: string;
    sortBy?: 'lastActivity';
    sortOrder?: 'asc' | 'desc';
}
export interface TransitionMeta {
    rejectionReason?: string;
}
export interface TransitionStatusInput {
    candidateId: string;
    targetStatus: CandidateStatus;
    rejectionReason?: string;
}
