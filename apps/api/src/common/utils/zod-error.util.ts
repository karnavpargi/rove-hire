interface ZodValidationIssue {
  message: string;
}

interface ZodValidationError {
  issues: ZodValidationIssue[];
}

/** Format Zod validation issues as a single human-readable message. */
export function formatZodError(error: ZodValidationError): string {
  return error.issues.map((issue) => issue.message).join('; ');
}
