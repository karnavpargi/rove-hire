import { CandidateStatus } from '../types/candidate';
export declare const VALID_FORWARD_TRANSITIONS: Record<CandidateStatus, CandidateStatus[]>;
export declare const VALID_TRANSITIONS: Record<CandidateStatus, CandidateStatus[]>;
export declare const REJECTABLE_STATUSES: CandidateStatus[];
export declare const TERMINAL_STATUSES: CandidateStatus[];
export declare function getValidTransitions(status: CandidateStatus): CandidateStatus[];
export declare function isValidTransition(from: CandidateStatus, to: CandidateStatus): boolean;
export declare const STATE_TRANSITIONS: Record<CandidateStatus, CandidateStatus[]>;
export declare function isTerminalStatus(status: CandidateStatus): boolean;
