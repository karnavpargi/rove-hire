/**
 * Job opening types shared between frontend and backend.
 */

/** Job opening status (PascalCase to match Prisma enum) */
export enum JobOpeningStatus {
  Open = 'Open',
  Closed = 'Closed',
}

/** Alias for JobOpeningStatus — matches task nomenclature */
export type JobStatus = JobOpeningStatus;

/** Skill tag associated with a job opening */
export interface JobOpeningSkill {
  id: string;
  tag: string;
}

/** Core job opening data */
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

/** Input for creating a new job opening */
export interface CreateJobOpeningInput {
  title: string;
  description?: string | null;
  skills: string[];
}

/** Input for updating a job opening's status */
export interface UpdateJobOpeningStatusInput {
  id: string;
  status: JobOpeningStatus;
}

/** Input for updating a job opening (all fields optional except id) */
export interface UpdateJobOpeningInput {
  id: string;
  title: string;
  description?: string | null;
  skills: string[];
  status?: JobOpeningStatus;
}

/** Filters for querying job openings */
export interface JobOpeningFilters {
  page?: number;
  pageSize?: number;
  status?: JobOpeningStatus;
  search?: string;
}
