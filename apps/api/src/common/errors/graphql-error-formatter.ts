import type { GraphQLFormattedError } from 'graphql';
import { Logger } from '@nestjs/common';

/**
 * Error codes returned in the `extensions.code` field of GraphQL errors.
 * These are machine-readable codes for frontend consumption.
 *
 * Requirements: 23.4, 23.5
 */
export type ErrorCode =
  | 'VALIDATION_ERROR'
  | 'AUTHENTICATION_ERROR'
  | 'AUTHORIZATION_ERROR'
  | 'NOT_FOUND'
  | 'INTERNAL_ERROR'
  | 'CONFLICT_ERROR'
  | 'RATE_LIMIT_ERROR'
  | 'DEPTH_LIMIT_ERROR'
  | 'COMPLEXITY_ERROR';

/**
 * Structured error extensions format.
 * All GraphQL errors include these standardized extensions.
 *
 * Requirements: 23.4, 23.5, 23.6
 */
export interface StructuredErrorExtensions {
  /** Machine-readable error code */
  code: ErrorCode;
  /** Optional field path that caused the error */
  field?: string;
  /** Human-readable error details */
  details?: string;
  /** Valid transitions for state machine errors */
  validTransitions?: string[];
  /** Seconds until retry (for rate limiting) */
  retryAfter?: number;
  /** Allow additional string-keyed properties */
  [key: string]: unknown;
}

const logger = new Logger('GraphQLErrorFormatter');

/**
 * Format GraphQL errors into a structured response with code, message, and field path.
 * Maps NestJS exceptions and custom errors to the standardized error format.
 *
 * Error classification:
 * - Depth/complexity limit: DEPTH_LIMIT_ERROR / COMPLEXITY_ERROR
 * - Validation errors (BadRequest): VALIDATION_ERROR
 * - Auth errors (Unauthorized): AUTHENTICATION_ERROR
 * - Forbidden errors: AUTHORIZATION_ERROR
 * - Not found: NOT_FOUND
 * - Conflict: CONFLICT_ERROR
 * - Rate limited: RATE_LIMIT_ERROR
 * - All other: INTERNAL_ERROR
 *
 * Requirements: 23.4, 23.5, 23.6
 */
export function formatGraphQLError(formattedError: GraphQLFormattedError): GraphQLFormattedError {
  const message = formattedError.message ?? 'An unexpected error occurred';
  const originalExtensions = formattedError.extensions ?? {};

  // Determine error code from various sources
  const code = classifyError(message, originalExtensions);

  // Build structured extensions
  const extensions: StructuredErrorExtensions = {
    code,
  };

  // Extract field path if available
  if (originalExtensions['field']) {
    extensions.field = originalExtensions['field'] as string;
  }

  // Extract details
  if (originalExtensions['details']) {
    extensions.details = originalExtensions['details'] as string;
  } else if (code !== 'INTERNAL_ERROR') {
    extensions.details = message;
  }

  // Extract valid transitions for state machine errors
  if (originalExtensions['validTransitions']) {
    extensions.validTransitions = originalExtensions['validTransitions'] as string[];
  }

  // Extract retryAfter for rate limit errors
  if (originalExtensions['retryAfter']) {
    extensions.retryAfter = originalExtensions['retryAfter'] as number;
  }

  // Log internal errors for debugging (don't expose details to client)
  if (code === 'INTERNAL_ERROR') {
    logger.error(`Internal error: ${message}`, formattedError.extensions?.['stacktrace']);
    return {
      message: 'An unexpected error occurred',
      path: formattedError.path,
      locations: formattedError.locations,
      extensions,
    };
  }

  return {
    message,
    path: formattedError.path,
    locations: formattedError.locations,
    extensions,
  };
}

/**
 * Classify error by examining the error message and existing extensions.
 */
function classifyError(message: string, extensions: Record<string, unknown>): ErrorCode {
  // Check if there's already a code set from NestJS exception filters
  const existingCode = extensions['code'] as string | undefined;

  if (existingCode) {
    const normalizedCode = existingCode.toUpperCase();
    if (isValidErrorCode(normalizedCode)) {
      return normalizedCode as ErrorCode;
    }
  }

  // Check for original NestJS exception status codes
  const originalError = extensions['originalError'] as
    | {
        statusCode?: number;
        code?: string;
      }
    | undefined;

  if (originalError?.code) {
    const oCode = originalError.code.toUpperCase();
    if (isValidErrorCode(oCode)) {
      return oCode as ErrorCode;
    }
  }

  // Classify by HTTP-like status code
  const statusCode = (originalError?.statusCode ??
    extensions['status'] ??
    extensions['statusCode']) as number | undefined;

  if (statusCode) {
    switch (statusCode) {
      case 400:
        return 'VALIDATION_ERROR';
      case 401:
        return 'AUTHENTICATION_ERROR';
      case 403:
        return 'AUTHORIZATION_ERROR';
      case 404:
        return 'NOT_FOUND';
      case 409:
        return 'CONFLICT_ERROR';
      case 429:
        return 'RATE_LIMIT_ERROR';
      default:
        return 'INTERNAL_ERROR';
    }
  }

  // Classify by message content
  const lowerMessage = message.toLowerCase();

  if (lowerMessage.includes('depth limit') || lowerMessage.includes('maximum allowed depth')) {
    return 'DEPTH_LIMIT_ERROR';
  }

  if (lowerMessage.includes('complexity') || lowerMessage.includes('maximum allowed complexity')) {
    return 'COMPLEXITY_ERROR';
  }

  if (
    lowerMessage.includes('validation') ||
    lowerMessage.includes('invalid') ||
    lowerMessage.includes('must be') ||
    lowerMessage.includes('required')
  ) {
    return 'VALIDATION_ERROR';
  }

  if (
    lowerMessage.includes('authentication') ||
    lowerMessage.includes('unauthorized') ||
    lowerMessage.includes('not authenticated')
  ) {
    return 'AUTHENTICATION_ERROR';
  }

  if (lowerMessage.includes('forbidden') || lowerMessage.includes('access denied')) {
    return 'AUTHORIZATION_ERROR';
  }

  if (lowerMessage.includes('not found')) {
    return 'NOT_FOUND';
  }

  if (lowerMessage.includes('conflict') || lowerMessage.includes('already exists')) {
    return 'CONFLICT_ERROR';
  }

  if (
    lowerMessage.includes('rate limit') ||
    lowerMessage.includes('too many requests') ||
    lowerMessage.includes('temporarily locked')
  ) {
    return 'RATE_LIMIT_ERROR';
  }

  return 'INTERNAL_ERROR';
}

/**
 * Check if a string is a valid ErrorCode.
 */
function isValidErrorCode(code: string): boolean {
  const validCodes: ErrorCode[] = [
    'VALIDATION_ERROR',
    'AUTHENTICATION_ERROR',
    'AUTHORIZATION_ERROR',
    'NOT_FOUND',
    'INTERNAL_ERROR',
    'CONFLICT_ERROR',
    'RATE_LIMIT_ERROR',
    'DEPTH_LIMIT_ERROR',
    'COMPLEXITY_ERROR',
  ];
  return validCodes.includes(code as ErrorCode);
}
