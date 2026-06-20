import { z } from 'zod';
import type { ValidationResult } from './email';
export declare const passwordSchema: z.ZodString;
export declare const loginFormSchema: z.ZodObject<{
    email: z.ZodString;
    password: z.ZodString;
}, "strip", z.ZodTypeAny, {
    email: string;
    password: string;
}, {
    email: string;
    password: string;
}>;
export type LoginFormInput = z.infer<typeof loginFormSchema>;
export declare function validatePassword(input: unknown): ValidationResult<string>;
export declare function validateLoginForm(input: unknown): ValidationResult<LoginFormInput>;
