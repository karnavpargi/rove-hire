/**
 * GraphQL error types shared between frontend and backend.
 */

/** Machine-readable error codes for GraphQL error extensions */
export enum GraphQLErrorCode {
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  AUTHENTICATION_ERROR = 'AUTHENTICATION_ERROR',
  AUTHORIZATION_ERROR = 'AUTHORIZATION_ERROR',
  NOT_FOUND = 'NOT_FOUND',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  CONFLICT_ERROR = 'CONFLICT_ERROR',
  RATE_LIMIT_ERROR = 'RATE_LIMIT_ERROR',
}

/** Structured error extensions attached to GraphQL errors */
export interface GraphQLErrorExtensions {
  code: GraphQLErrorCode;
  /** Field path that caused the error */
  field?: string;
  /** Human-readable description */
  details?: string;
  /** Valid transitions for state machine errors */
  validTransitions?: string[];
  /** Seconds until retry (for rate limiting) */
  retryAfter?: number;
}
