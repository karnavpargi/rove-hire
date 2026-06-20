import { z } from 'zod';
import type { ValidationResult } from './email';
export declare const linkedinUrlSchema: z.ZodEffects<z.ZodString, string, string>;
export declare const optionalLinkedinUrlSchema: z.ZodNullable<z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>>;
export declare function validateLinkedinUrl(input: unknown): ValidationResult<string>;
