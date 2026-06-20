/**
 * GraphQL client configuration using graphql-request.
 *
 * Provides:
 * - Cookie-based authentication (credentials: 'include')
 * - Comprehensive error handling per error code:
 *   - NETWORK_ERROR -> toast "Connection error"
 *   - AUTHENTICATION_ERROR (401) -> redirect to /login, persist form data
 *   - VALIDATION_ERROR -> return field-level errors for inline display
 *   - CONFLICT_ERROR -> toast with conflict message, revert optimistic update
 *   - RATE_LIMIT_ERROR -> toast with retry countdown
 *   - INTERNAL_ERROR -> error state with retry button
 *
 * Validates: Requirements 17.3, 17.6, 12.5, 12.6, 28.1
 */

import { GraphQLClient, ClientError } from 'graphql-request';
import { GraphQLErrorCode } from '@rove-hire/shared';
import type { GraphQLErrorExtensions } from '@rove-hire/shared';
import { saveFormData } from './form-persistence';

// ---------------------------------------------------------------------------
// Client Setup
// ---------------------------------------------------------------------------

const GRAPHQL_ENDPOINT =
  process.env.NEXT_PUBLIC_GRAPHQL_URL || 'http://localhost:3001/graphql';

/**
 * Configured GraphQL client with cookie-based authentication.
 * Uses credentials: 'include' so HttpOnly cookies are sent with every request.
 */
export const graphqlClient = new GraphQLClient(GRAPHQL_ENDPOINT, {
  credentials: 'include',
  headers: {
    'Content-Type': 'application/json',
  },
});

// ---------------------------------------------------------------------------
// Error Types
// ---------------------------------------------------------------------------

/** Parsed field-level validation error for inline form display. */
export interface FieldError {
  field: string;
  message: string;
}

/**
 * Classified error result for UI consumption.
 * Components use this to decide how to render errors.
 */
export interface ClassifiedError {
  type: GraphQLErrorCode | 'NETWORK_ERROR';
  message: string;
  fieldErrors?: FieldError[];
  retryAfter?: number;
  validTransitions?: string[];
}

// ---------------------------------------------------------------------------
// Error Extraction
// ---------------------------------------------------------------------------

interface GqlResponseError {
  message: string;
  extensions?: Record<string, unknown>;
}

/**
 * Extract GraphQL error extensions from a graphql-request ClientError.
 */
export function extractErrorExtensions(
  error: unknown
): GraphQLErrorExtensions | null {
  if (!isClientError(error)) return null;

  const response = error.response as { errors?: GqlResponseError[] };
  if (response?.errors?.[0]?.extensions) {
    return response.errors[0].extensions as unknown as GraphQLErrorExtensions;
  }
  return null;
}

/**
 * Extract all GraphQL error extensions from a ClientError (multiple errors).
 */
export function extractAllErrorExtensions(
  error: unknown
): GraphQLErrorExtensions[] {
  if (!isClientError(error)) return [];

  const response = error.response as { errors?: GqlResponseError[] };
  if (!response?.errors) return [];

  return response.errors
    .filter((e: GqlResponseError) => e.extensions)
    .map((e: GqlResponseError) => e.extensions as unknown as GraphQLErrorExtensions);
}

// ---------------------------------------------------------------------------
// Error Classification
// ---------------------------------------------------------------------------

/**
 * Classify an error into a structured result the UI can act on.
 * This is the primary error-handling utility for components.
 */
export function classifyError(error: unknown): ClassifiedError {
  // Network errors (fetch failures, timeouts, etc.)
  if (isNetworkError(error)) {
    return {
      type: 'NETWORK_ERROR',
      message: 'Connection error. Please check your network and try again.',
    };
  }

  // GraphQL errors from the server
  const extensions = extractErrorExtensions(error);
  if (!extensions) {
    return {
      type: GraphQLErrorCode.INTERNAL_ERROR,
      message: 'An unexpected error occurred. Please try again.',
    };
  }

  switch (extensions.code) {
    case GraphQLErrorCode.VALIDATION_ERROR: {
      const allExtensions = extractAllErrorExtensions(error);
      const fieldErrors: FieldError[] = allExtensions
        .filter((ext) => ext.field)
        .map((ext) => ({
          field: ext.field!,
          message: ext.details ?? 'Invalid value',
        }));

      return {
        type: GraphQLErrorCode.VALIDATION_ERROR,
        message: 'Please fix the highlighted fields.',
        fieldErrors: fieldErrors.length > 0 ? fieldErrors : undefined,
      };
    }

    case GraphQLErrorCode.AUTHENTICATION_ERROR:
      return {
        type: GraphQLErrorCode.AUTHENTICATION_ERROR,
        message: 'Your session has expired. Please log in again.',
      };

    case GraphQLErrorCode.AUTHORIZATION_ERROR:
      return {
        type: GraphQLErrorCode.AUTHORIZATION_ERROR,
        message: 'You do not have permission to perform this action.',
      };

    case GraphQLErrorCode.NOT_FOUND:
      return {
        type: GraphQLErrorCode.NOT_FOUND,
        message: extensions.details ?? 'The requested resource was not found.',
      };

    case GraphQLErrorCode.CONFLICT_ERROR:
      return {
        type: GraphQLErrorCode.CONFLICT_ERROR,
        message:
          extensions.details ??
          'A conflict occurred. The data has been updated by another user.',
        validTransitions: extensions.validTransitions,
      };

    case GraphQLErrorCode.RATE_LIMIT_ERROR:
      return {
        type: GraphQLErrorCode.RATE_LIMIT_ERROR,
        message: `Too many requests. Please try again in ${extensions.retryAfter ?? 60} seconds.`,
        retryAfter: extensions.retryAfter,
      };

    case GraphQLErrorCode.INTERNAL_ERROR:
    default:
      return {
        type: GraphQLErrorCode.INTERNAL_ERROR,
        message: 'An internal error occurred. Please try again later.',
      };
  }
}

// ---------------------------------------------------------------------------
// Error Type Guards
// ---------------------------------------------------------------------------

/** Check if an error is a graphql-request ClientError. */
export function isClientError(error: unknown): error is ClientError {
  return (
    error instanceof Error &&
    'response' in error &&
    typeof (error as ClientError).response === 'object'
  );
}

/** Check if an error is a network error (fetch failed). */
export function isNetworkError(error: unknown): boolean {
  // TypeError from fetch API (e.g., "Failed to fetch")
  if (error instanceof TypeError) {
    const msg = error.message.toLowerCase();
    return msg.includes('fetch') || msg.includes('network');
  }
  // Non-ClientError Error instances without a 'response' property are network failures
  if (error instanceof Error && !('response' in error)) {
    return true;
  }
  return false;
}

/** Check if a GraphQL error is an authentication error (401). */
export function isAuthenticationError(error: unknown): boolean {
  const ext = extractErrorExtensions(error);
  return ext?.code === GraphQLErrorCode.AUTHENTICATION_ERROR;
}

/** Check if a GraphQL error is a conflict error (409). */
export function isConflictError(error: unknown): boolean {
  const ext = extractErrorExtensions(error);
  return ext?.code === GraphQLErrorCode.CONFLICT_ERROR;
}

/** Check if a GraphQL error is a rate limit error (429). */
export function isRateLimitError(error: unknown): {
  limited: boolean;
  retryAfter?: number;
} {
  const ext = extractErrorExtensions(error);
  if (ext?.code === GraphQLErrorCode.RATE_LIMIT_ERROR) {
    return { limited: true, retryAfter: ext.retryAfter };
  }
  return { limited: false };
}

/** Check if a GraphQL error is a validation error (400). */
export function isValidationError(error: unknown): boolean {
  const ext = extractErrorExtensions(error);
  return ext?.code === GraphQLErrorCode.VALIDATION_ERROR;
}

// ---------------------------------------------------------------------------
// Error Handling Actions
// ---------------------------------------------------------------------------

/**
 * Dispatch a toast notification via custom event.
 * Components listening to 'rove-hire:toast' will display the notification.
 */
export function dispatchToast(
  message: string,
  type: 'success' | 'error' | 'warning' | 'info' = 'error',
  options?: { retryAfter?: number }
): void {
  if (typeof window === 'undefined') return;

  window.dispatchEvent(
    new CustomEvent('rove-hire:toast', {
      detail: { message, type, ...options },
    })
  );
}

/**
 * Handle a GraphQL error with the full error strategy:
 * - NETWORK_ERROR -> toast
 * - AUTHENTICATION_ERROR -> redirect to login (with form persistence)
 * - VALIDATION_ERROR -> return field errors for inline display
 * - CONFLICT_ERROR -> toast
 * - RATE_LIMIT_ERROR -> toast with countdown
 * - INTERNAL_ERROR -> pass through for error state rendering
 *
 * @returns The classified error for component-level handling
 */
export function handleGraphQLError(
  error: unknown,
  options?: {
    /** Form data to persist if 401 occurs during submission */
    formData?: Record<string, unknown>;
    /** Current path for form data persistence */
    currentPath?: string;
  }
): ClassifiedError {
  const classified = classifyError(error);

  switch (classified.type) {
    case 'NETWORK_ERROR':
      dispatchToast(classified.message, 'error');
      break;

    case GraphQLErrorCode.AUTHENTICATION_ERROR:
      // Persist form data before redirect
      if (typeof window !== 'undefined') {
        if (options?.formData && options?.currentPath) {
          saveFormData(options.currentPath, options.formData);
        }
        window.location.href = '/login';
      }
      break;

    case GraphQLErrorCode.CONFLICT_ERROR:
      dispatchToast(classified.message, 'warning');
      break;

    case GraphQLErrorCode.RATE_LIMIT_ERROR:
      dispatchToast(classified.message, 'error', {
        retryAfter: classified.retryAfter,
      });
      break;

    // VALIDATION_ERROR, NOT_FOUND, INTERNAL_ERROR handled by calling component
    default:
      break;
  }

  return classified;
}
