/**
 * Job opening validation schemas and utilities.
 * - Title: 1-200 characters, non-empty.
 * - Skills tags: array of 1-20 items, each max 50 characters, non-empty.
 *
 * Validates: Requirements 3.6, 3.8, 25.5
 */

import { z } from 'zod';
import type { ValidationResult } from './email';

/**
 * Job title Zod schema — non-empty, max 200 characters.
 */
export const jobTitleSchema = z
  .string()
  .min(1, 'Job title is required')
  .max(200, 'Job title must not exceed 200 characters');

/**
 * Skills tags Zod schema — array of 1-20 non-empty strings, each max 50 chars.
 */
export const skillsTagsSchema = z
  .array(
    z
      .string()
      .min(1, 'Skill tag must not be empty')
      .max(50, 'Each skill tag must not exceed 50 characters'),
  )
  .min(1, 'At least 1 skill tag is required')
  .max(20, 'Must not exceed 20 skill tags');

/**
 * Standalone job title validation function.
 */
export function validateJobTitle(input: unknown): ValidationResult<string> {
  const result = jobTitleSchema.safeParse(input);
  if (result.success) {
    return { valid: true, success: true, data: result.data, errors: [] };
  }
  const errors = result.error.issues.map((i) => i.message);
  return { valid: false, success: false, error: errors[0], errors };
}

/**
 * Standalone skills tags validation function.
 */
export function validateSkillsTags(input: unknown): ValidationResult<string[]> {
  const result = skillsTagsSchema.safeParse(input);
  if (result.success) {
    return { valid: true, success: true, data: result.data, errors: [] };
  }
  const errors = result.error.issues.map((i) => i.message);
  return { valid: false, success: false, error: errors[0], errors };
}
