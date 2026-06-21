export declare enum InterviewType {
    Screening = "Screening",
    Technical = "Technical"
}
export declare enum InterviewStatus {
    Scheduled = "Scheduled",
    Completed = "Completed",
    Cancelled = "Cancelled"
}
export declare enum Recommendation {
    Hire = "Hire",
    NoHire = "NoHire",
    Maybe = "Maybe"
}
export interface Interview {
    id: string;
    candidateId: string;
    type: InterviewType;
    scheduledAt: string;
    interviewerName: string;
    notes?: string | null;
    status: InterviewStatus;
    recommendation?: Recommendation | null;
    feedback?: string | null;
    completedAt?: string | null;
    createdAt: string;
    updatedAt: string;
}
export interface ScheduleInterviewInput {
    candidateId: string;
    type: InterviewType;
    scheduledAt: string;
    interviewerName: string;
    notes?: string | null;
}
export interface RecordFeedbackInput {
    interviewId: string;
    recommendation: Recommendation;
    feedback: string;
}
export interface InterviewFilters {
    candidateId?: string;
    type?: InterviewType;
    status?: InterviewStatus;
    sortBy?: 'scheduledAt';
    sortOrder?: 'asc' | 'desc';
}
