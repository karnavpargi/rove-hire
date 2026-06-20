/**
 * Shared validation schemas and utilities.
 * Uses Zod for type-safe validation across frontend and backend.
 *
 * Each domain has its own module with both a Zod schema and a standalone
 * validate function for easy use without Zod as a direct dependency.
 */

// ---- Individual validator modules ----
export { emailSchema, validateEmail, type ValidationResult } from './email';

export { phoneSchema, validatePhone } from './phone';

export {
  salaryAmountSchema,
  currencySchema,
  salaryInputSchema,
  validateSalaryAmount,
  validateCurrency,
  validateSalaryInput,
  type SalaryInput,
} from './salary';

export { linkedinUrlSchema, optionalLinkedinUrlSchema, validateLinkedinUrl } from './linkedin';

export { jobTitleSchema, skillsTagsSchema, validateJobTitle, validateSkillsTags } from './job';

export {
  candidateNameSchema,
  rejectionReasonSchema,
  validateCandidateName,
  validateRejectionReason,
} from './candidate';

export {
  interviewNotesSchema,
  feedbackSchema,
  interviewerNameSchema,
  validateInterviewNotes,
  validateFeedback,
  validateInterviewerName,
} from './interview';

export {
  passwordSchema,
  loginFormSchema,
  validatePassword,
  validateLoginForm,
  type LoginFormInput,
} from './auth';

// ---- Additional utility schemas (not yet in their own module) ----
export { reportingManagerSchema, locationSchema, searchQuerySchema } from './schemas';
