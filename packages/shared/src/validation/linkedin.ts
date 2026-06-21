/**
 * LinkedIn URL validation schema and utility.
 * Must start with "https://linkedin.com/" or "https://www.linkedin.com/".
 *
 * Validates: Requirements 5.8, 25.4
 */

import { z } from 'zod';
import type { ValidationResult } from './email';

/**
 * LinkedIn URL Zod schema — must start with approved prefix, max 255 chars.
 */
export const linkedinUrlSchema = z
  .string()
  .min(1, 'LinkedIn URL is required')
  .max(255, 'LinkedIn URL must not exceed 255 characters')
  .refine(
    (val) => val.startsWith('https://linkedin.com/') || val.startsWith('https://www.linkedin.com/'),
    { message: 'LinkedIn URL must start with https://linkedin.com/ or https://www.linkedin.com/' },
  );

/**
 * Optional LinkedIn URL schema — allows empty string, undefined, or null.
 * Validates format only when a non-empty value is provided.
 */
export const optionalLinkedinUrlSchema = z
  .string()
  .max(255, 'LinkedIn URL must not exceed 255 characters')
  .refine(
    (val) =>
      val === '' ||
      val.startsWith('https://linkedin.com/') ||
      val.startsWith('https://www.linkedin.com/'),
    { message: 'LinkedIn URL must start with https://linkedin.com/ or https://www.linkedin.com/' },
  )
  .optional()
  .nullable();

/**
 * Standalone LinkedIn URL validation function.
 */
export function validateLinkedinUrl(input: unknown): ValidationResult<string> {
  const result = linkedinUrlSchema.safeParse(input);
  if (result.success) {
    return { valid: true, success: true, data: result.data, errors: [] };
  }
  const errors = result.error.issues.map((i) => i.message);
  return { valid: false, success: false, error: errors[0], errors };
}
