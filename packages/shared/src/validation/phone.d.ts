import { z } from 'zod';
import type { ValidationResult } from './email';
export declare const phoneSchema: z.ZodString;
export declare function validatePhone(input: unknown): ValidationResult<string>;
