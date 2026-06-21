/**
 * Phone number validation schema and utility.
 * Only digits, spaces, hyphens, parentheses, or a leading plus sign allowed.
 * Length between 7 and 20 characters inclusive.
 *
 * Validates: Requirements 5.7, 25.2
 */

import { z } from 'zod';
import type { ValidationResult } from './email';

/**
 * Phone Zod schema — digits, spaces, hyphens, parens, optional leading +.
 * 7-20 characters total.
 */
export const phoneSchema = z
  .string()
  .min(7, 'Phone number must be at least 7 characters')
  .max(20, 'Phone number must not exceed 20 characters')
  .regex(
    /^\+?[\d\s\-()]+$/,
    'Phone number may only contain digits, spaces, hyphens, parentheses, or a leading plus sign',
  );

/**
 * Standalone phone validation function.
 */
export function validatePhone(input: unknown): ValidationResult<string> {
  const result = phoneSchema.safeParse(input);
  if (result.success) {
    return { valid: true, success: true, data: result.data, errors: [] };
  }
  const errors = result.error.issues.map((i) => i.message);
  return { valid: false, success: false, error: errors[0], errors };
}
