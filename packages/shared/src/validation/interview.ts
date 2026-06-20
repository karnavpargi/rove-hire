/**
 * Interview-related validation schemas and utilities.
 * - Notes: max 1000 characters (optional).
 * - Feedback: 1-2000 characters.
 * - Interviewer name: 1-100 characters.
 *
 * Validates: Requirements 6.1, 6.4, 6.7
 */

import { z } from 'zod';
import type { ValidationResult } from './email';

/**
 * Interview notes Zod schema — max 1000 characters (optional field).
 */
export const interviewNotesSchema = z
  .string()
  .max(1000, 'Interview notes must not exceed 1000 characters');

/**
 * Interview feedback Zod schema — between 1 and 2000 characters.
 */
export const feedbackSchema = z
  .string()
  .min(1, 'Feedback is required')
  .max(2000, 'Feedback must not exceed 2000 characters');

/**
 * Interviewer name Zod schema — 1 to 100 characters.
 */
export const interviewerNameSchema = z
  .string()
  .min(1, 'Interviewer name is required')
  .max(100, 'Interviewer name must not exceed 100 characters');

/**
 * Standalone interview notes validation function.
 */
export function validateInterviewNotes(input: unknown): ValidationResult<string> {
  const result = interviewNotesSchema.safeParse(input);
  if (result.success) {
    return { valid: true, success: true, data: result.data, errors: [] };
  }
  const errors = result.error.issues.map((i) => i.message);
  return { valid: false, success: false, error: errors[0], errors };
}

/**
 * Standalone feedback validation function.
 */
export function validateFeedback(input: unknown): ValidationResult<string> {
  const result = feedbackSchema.safeParse(input);
  if (result.success) {
    return { valid: true, success: true, data: result.data, errors: [] };
  }
  const errors = result.error.issues.map((i) => i.message);
  return { valid: false, success: false, error: errors[0], errors };
}

/**
 * Standalone interviewer name validation function.
 */
export function validateInterviewerName(input: unknown): ValidationResult<string> {
  const result = interviewerNameSchema.safeParse(input);
  if (result.success) {
    return { valid: true, success: true, data: result.data, errors: [] };
  }
  const errors = result.error.issues.map((i) => i.message);
  return { valid: false, success: false, error: errors[0], errors };
}
