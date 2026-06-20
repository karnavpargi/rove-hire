import { z } from 'zod';
import type { ValidationResult } from './email';
export declare const jobTitleSchema: z.ZodString;
export declare const skillsTagsSchema: z.ZodArray<z.ZodString, "many">;
export declare function validateJobTitle(input: unknown): ValidationResult<string>;
export declare function validateSkillsTags(input: unknown): ValidationResult<string[]>;
