/**
 * Shared Zod validation schemas for ROVE Hire.
 * Used by both frontend and backend for consistent input validation.
 *
 * This file re-exports all schemas from individual validator modules
 * for backward compatibility.
 */

// Email
export { emailSchema } from './email';
export type { ValidationResult } from './email';

// Phone
export { phoneSchema } from './phone';

// Salary
export { salaryAmountSchema, currencySchema, salaryInputSchema } from './salary';
export type { SalaryInput } from './salary';

// LinkedIn
export { linkedinUrlSchema, optionalLinkedinUrlSchema } from './linkedin';

// Job
export { jobTitleSchema, skillsTagsSchema } from './job';

// Candidate
export { candidateNameSchema, rejectionReasonSchema } from './candidate';

// Interview
export { interviewNotesSchema, feedbackSchema, interviewerNameSchema } from './interview';

// Auth
export { passwordSchema, loginFormSchema } from './auth';
export type { LoginFormInput } from './auth';

// ---------------------------------------------------------------------------
// Additional utility schemas used in other contexts
// ---------------------------------------------------------------------------

import { z } from 'zod';

/**
 * Reporting manager name validation — max 100 characters.
 */
export const reportingManagerSchema = z
  .string()
  .min(1, 'Reporting manager name is required')
  .max(100, 'Reporting manager name must not exceed 100 characters');

/**
 * Location validation — max 200 characters for offer details.
 */
export const locationSchema = z
  .string()
  .min(1, 'Location is required')
  .max(200, 'Location must not exceed 200 characters');

/**
 * Search query validation — between 2 and 100 characters.
 */
export const searchQuerySchema = z
  .string()
  .min(2, 'Search query must be at least 2 characters')
  .max(100, 'Search query must not exceed 100 characters');
