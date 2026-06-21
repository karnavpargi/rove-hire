import { z } from 'zod';
import type { ValidationResult } from './email';
export declare const salaryAmountSchema: z.ZodEffects<z.ZodNumber, number, number>;
export declare const currencySchema: z.ZodEnum<["USD", "EUR", "GBP", "INR", "AED"]>;
export declare const salaryInputSchema: z.ZodObject<{
    amount: z.ZodEffects<z.ZodNumber, number, number>;
    currency: z.ZodEnum<["USD", "EUR", "GBP", "INR", "AED"]>;
}, "strip", z.ZodTypeAny, {
    amount: number;
    currency: "USD" | "EUR" | "GBP" | "INR" | "AED";
}, {
    amount: number;
    currency: "USD" | "EUR" | "GBP" | "INR" | "AED";
}>;
export type SalaryInput = z.infer<typeof salaryInputSchema>;
export declare function validateSalaryAmount(input: unknown): ValidationResult<number>;
export declare function validateCurrency(input: unknown): ValidationResult<string>;
export declare function validateSalaryInput(input: unknown): ValidationResult<SalaryInput>;
