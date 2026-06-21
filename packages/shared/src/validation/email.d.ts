import { z } from 'zod';
export declare const emailSchema: z.ZodString;
export interface ValidationResult<T = string> {
    valid: boolean;
    success: boolean;
    data?: T;
    error?: string;
    errors: string[];
}
export declare function validateEmail(input: unknown): ValidationResult<string>;
