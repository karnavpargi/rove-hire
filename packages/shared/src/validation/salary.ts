/**
 * Salary validation schemas and utility.
 * Amount: 0.01–9,999,999.99, max 2 decimal places.
 * Currency: USD, EUR, GBP, INR, AED.
 *
 * Validates: Requirements 8.8, 25.3
 */

import { z } from 'zod';
import type { ValidationResult } from './email';

/**
 * Salary amount Zod schema — positive number between 0.01 and 9,999,999.99
 * with at most 2 decimal places.
 */
export const salaryAmountSchema = z
  .number()
  .min(0.01, 'Salary must be at least 0.01')
  .max(9_999_999.99, 'Salary must not exceed 9,999,999.99')
  .refine(
    (val) => {
      // Check max 2 decimal places using string representation
      const parts = val.toString().split('.');
      return !parts[1] || parts[1].length <= 2;
    },
    { message: 'Salary must have at most 2 decimal places' },
  );

/**
 * Currency Zod schema — one of the supported currencies.
 */
export const currencySchema = z.enum(['USD', 'EUR', 'GBP', 'INR', 'AED'], {
  message: 'Currency must be one of: USD, EUR, GBP, INR, AED',
});

/**
 * Composite salary input schema — amount + currency.
 */
export const salaryInputSchema = z.object({
  amount: salaryAmountSchema,
  currency: currencySchema,
});

/** Inferred type for salary input */
export type SalaryInput = z.infer<typeof salaryInputSchema>;

/**
 * Standalone salary amount validation function.
 */
export function validateSalaryAmount(input: unknown): ValidationResult<number> {
  const result = salaryAmountSchema.safeParse(input);
  if (result.success) {
    return { valid: true, success: true, data: result.data, errors: [] };
  }
  const errors = result.error.issues.map((i) => i.message);
  return { valid: false, success: false, error: errors[0], errors };
}

/**
 * Standalone currency validation function.
 */
export function validateCurrency(input: unknown): ValidationResult<string> {
  const result = currencySchema.safeParse(input);
  if (result.success) {
    return { valid: true, success: true, data: result.data, errors: [] };
  }
  const errors = result.error.issues.map((i) => i.message);
  return { valid: false, success: false, error: errors[0], errors };
}

/**
 * Standalone salary input validation function (amount + currency).
 */
export function validateSalaryInput(input: unknown): ValidationResult<SalaryInput> {
  const result = salaryInputSchema.safeParse(input);
  if (result.success) {
    return { valid: true, success: true, data: result.data, errors: [] };
  }
  const errors = result.error.issues.map((i) => i.message);
  return { valid: false, success: false, error: errors[0], errors };
}
