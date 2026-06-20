/**
 * Interview-related types shared between frontend and backend.
 */

/** Interview type categories (PascalCase to match Prisma enum) */
export enum InterviewType {
  Screening = 'Screening',
  Technical = 'Technical',
}

/** Interview completion status (PascalCase to match Prisma enum) */
export enum InterviewStatus {
  Scheduled = 'Scheduled',
  Completed = 'Completed',
  Cancelled = 'Cancelled',
}

/** Interview recommendation after completion (PascalCase to match Prisma enum) */
export enum Recommendation {
  Hire = 'Hire',
  NoHire = 'NoHire',
  Maybe = 'Maybe',
}

/** Core interview data */
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

/** Input for scheduling an interview */
export interface ScheduleInterviewInput {
  candidateId: string;
  type: InterviewType;
  scheduledAt: string;
  interviewerName: string;
  notes?: string | null;
}

/** Input for recording interview feedback */
export interface RecordFeedbackInput {
  interviewId: string;
  recommendation: Recommendation;
  feedback: string;
}

/** Filters for querying interviews */
export interface InterviewFilters {
  candidateId?: string;
  type?: InterviewType;
  status?: InterviewStatus;
  sortBy?: 'scheduledAt';
  sortOrder?: 'asc' | 'desc';
}
