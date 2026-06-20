/**
 * Shared validation limits and constraints.
 * These are used by both frontend (client-side validation) and backend (server-side validation).
 */

/** Authentication limits */
export const AUTH = {
  EMAIL_MAX_LENGTH: 254,
  PASSWORD_MIN_LENGTH: 8,
  PASSWORD_MAX_LENGTH: 128,
  SESSION_MAX_HOURS: 8,
  MAX_LOGIN_ATTEMPTS: 5,
  LOCKOUT_MINUTES: 15,
  RATE_LIMIT_REQUESTS: 10,
  RATE_LIMIT_WINDOW_SECONDS: 60,
} as const;

/** Candidate field limits */
export const CANDIDATE = {
  NAME_MAX_LENGTH: 100,
  EMAIL_MAX_LENGTH: 254,
  PHONE_MAX_LENGTH: 20,
  LOCATION_MAX_LENGTH: 100,
  CURRENT_ROLE_MAX_LENGTH: 100,
  NOTICE_PERIOD_MAX_LENGTH: 50,
  SALARY_EXPECTATION_MAX_LENGTH: 50,
  LINKEDIN_URL_MAX_LENGTH: 255,
  REJECTION_REASON_MIN_LENGTH: 5,
  REJECTION_REASON_MAX_LENGTH: 500,
} as const;

/** Job opening limits */
export const JOB_OPENING = {
  TITLE_MAX_LENGTH: 200,
  DESCRIPTION_MAX_LENGTH: 5000,
  SKILLS_MIN_COUNT: 1,
  SKILLS_MAX_COUNT: 20,
  SKILL_TAG_MAX_LENGTH: 50,
} as const;

/** Interview limits */
export const INTERVIEW = {
  INTERVIEWER_NAME_MAX_LENGTH: 100,
  NOTES_MAX_LENGTH: 1000,
  FEEDBACK_MIN_LENGTH: 1,
  FEEDBACK_MAX_LENGTH: 2000,
} as const;

/** Offer/document limits */
export const OFFER = {
  SALARY_MIN: 0.01,
  SALARY_MAX: 9_999_999.99,
  SALARY_DECIMAL_PLACES: 2,
} as const;

/** File upload limits */
export const FILE_UPLOAD = {
  MAX_SIZE_BYTES: 10 * 1024 * 1024, // 10 MB
  ALLOWED_MIME_TYPES: ['application/pdf'] as const,
} as const;

/** Magic link configuration */
export const MAGIC_LINK = {
  EXPIRY_DAYS: 14,
  TOKEN_BYTES: 32,
} as const;

/** Dashboard/pagination */
export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 20,
  SEARCH_MIN_LENGTH: 2,
  SEARCH_MAX_LENGTH: 100,
  SEARCH_DEBOUNCE_MS: 300,
  TIMELINE_MAX_EVENTS: 50,
} as const;
