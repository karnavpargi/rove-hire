import { z } from 'zod';
import type { ValidationResult } from './email';
export declare const interviewNotesSchema: z.ZodString;
export declare const feedbackSchema: z.ZodString;
export declare const interviewerNameSchema: z.ZodString;
export declare function validateInterviewNotes(input: unknown): ValidationResult<string>;
export declare function validateFeedback(input: unknown): ValidationResult<string>;
export declare function validateInterviewerName(input: unknown): ValidationResult<string>;
