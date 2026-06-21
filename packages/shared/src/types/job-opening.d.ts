export declare enum JobOpeningStatus {
    Open = "Open",
    Closed = "Closed"
}
export type JobStatus = JobOpeningStatus;
export interface JobOpeningSkill {
    id: string;
    tag: string;
}
export interface JobOpening {
    id: string;
    title: string;
    description?: string | null;
    skills: JobOpeningSkill[];
    status: JobOpeningStatus;
    candidateCount?: number;
    createdAt: string;
    updatedAt: string;
}
export interface CreateJobOpeningInput {
    title: string;
    description?: string | null;
    skills: string[];
}
export interface UpdateJobOpeningStatusInput {
    id: string;
    status: JobOpeningStatus;
}
export interface JobOpeningFilters {
    page?: number;
    pageSize?: number;
    status?: JobOpeningStatus;
    search?: string;
}
