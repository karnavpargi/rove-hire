import { z } from 'zod';
import type { ValidationResult } from './email';
export declare const candidateNameSchema: z.ZodString;
export declare const rejectionReasonSchema: z.ZodString;
export declare function validateCandidateName(input: unknown): ValidationResult<string>;
export declare function validateRejectionReason(input: unknown): ValidationResult<string>;
