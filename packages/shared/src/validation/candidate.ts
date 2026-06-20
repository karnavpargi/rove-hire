/**
 * Candidate-related validation schemas and utilities.
 * - Candidate name: max 100 characters, non-empty.
 * - Rejection reason: 5-500 characters.
 *
 * Validates: Requirements 4.1, 9.3, 9.4
 */

import { z } from 'zod';
import type { ValidationResult } from './email';

/**
 * Candidate name Zod schema — non-empty, max 100 characters.
 */
export const candidateNameSchema = z
  .string()
  .min(1, 'Candidate name is required')
  .max(100, 'Candidate name must not exceed 100 characters');

/**
 * Rejection reason Zod schema — between 5 and 500 characters.
 */
export const rejectionReasonSchema = z
  .string()
  .min(5, 'Rejection reason must be at least 5 characters')
  .max(500, 'Rejection reason must not exceed 500 characters');

/**
 * Standalone candidate name validation function.
 */
export function validateCandidateName(input: unknown): ValidationResult<string> {
  const result = candidateNameSchema.safeParse(input);
  if (result.success) {
    return { valid: true, success: true, data: result.data, errors: [] };
  }
  const errors = result.error.issues.map((i) => i.message);
  return { valid: false, success: false, error: errors[0], errors };
}

/**
 * Standalone rejection reason validation function.
 */
export function validateRejectionReason(input: unknown): ValidationResult<string> {
  const result = rejectionReasonSchema.safeParse(input);
  if (result.success) {
    return { valid: true, success: true, data: result.data, errors: [] };
  }
  const errors = result.error.issues.map((i) => i.message);
  return { valid: false, success: false, error: errors[0], errors };
}
