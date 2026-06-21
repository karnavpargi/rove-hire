/**
 * Authentication-related validation schemas and utilities.
 * - Password: 8-128 characters.
 * - Login form: email + password composite.
 *
 * Validates: Requirements 1.8
 */

import { z } from 'zod';
import { emailSchema } from './email';
import type { ValidationResult } from './email';

/**
 * Password Zod schema — between 8 and 128 characters.
 */
export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password must not exceed 128 characters');

/**
 * Login form composite Zod schema — email + password.
 */
export const loginFormSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});

/** Inferred type for login form input */
export type LoginFormInput = z.infer<typeof loginFormSchema>;

/**
 * Standalone password validation function.
 */
export function validatePassword(input: unknown): ValidationResult<string> {
  const result = passwordSchema.safeParse(input);
  if (result.success) {
    return { valid: true, success: true, data: result.data, errors: [] };
  }
  const errors = result.error.issues.map((i) => i.message);
  return { valid: false, success: false, error: errors[0], errors };
}

/**
 * Standalone login form validation function.
 */
export function validateLoginForm(input: unknown): ValidationResult<LoginFormInput> {
  const result = loginFormSchema.safeParse(input);
  if (result.success) {
    return { valid: true, success: true, data: result.data, errors: [] };
  }
  const errors = result.error.issues.map((i) => i.message);
  return { valid: false, success: false, error: errors[0], errors };
}
