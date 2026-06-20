/**
 * Email validation schema and utility.
 * RFC 5322 compliant, max 254 characters.
 *
 * Validates: Requirements 1.8, 4.8, 25.1
 */

import { z } from 'zod';

/**
 * Email Zod schema — RFC 5322 format, max 254 characters.
 */
export const emailSchema = z
  .string()
  .min(1, 'Email is required')
  .max(254, 'Email must not exceed 254 characters')
  .email('Email must be a valid email address');

/** Result type for standalone validate functions */
export interface ValidationResult<T = string> {
  /** Whether the input is valid */
  valid: boolean;
  /** Alias for valid — backward compat */
  success: boolean;
  /** Parsed/validated data when valid */
  data?: T;
  /** Single error message (first issue) — backward compat */
  error?: string;
  /** Array of all validation error messages */
  errors: string[];
}

/**
 * Standalone email validation function.
 * Returns a result object with valid/errors indicating validation outcome.
 */
export function validateEmail(input: unknown): ValidationResult<string> {
  const result = emailSchema.safeParse(input);
  if (result.success) {
    return { valid: true, success: true, data: result.data, errors: [] };
  }
  const errors = result.error.issues.map((i) => i.message);
  return { valid: false, success: false, error: errors[0], errors };
}
