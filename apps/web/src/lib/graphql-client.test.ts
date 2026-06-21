import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ClientError } from 'graphql-request';
import { GraphQLErrorCode } from '@rove-hire/shared';
import {
  classifyError,
  extractErrorExtensions,
  extractAllErrorExtensions,
  isAuthenticationError,
  isConflictError,
  isRateLimitError,
  isValidationError,
  isNetworkError,
  isClientError,
  handleGraphQLError,
  dispatchToast,
} from './graphql-client';

// Helper to create a mock ClientError
function createClientError(
  errors: Array<{ message: string; extensions?: Record<string, unknown> }>,
): ClientError {
  // ClientError expects a GraphQLResponse; cast to satisfy the constructor
  const response = {
    errors: errors.map((e) => ({ ...e, locations: undefined, path: undefined })),
    data: null,
    status: 200,
    headers: new Map(),
  } as unknown as Parameters<
    typeof ClientError extends new (r: infer R, ...a: unknown[]) => unknown ? (r: R) => void : never
  >[0];
  const error = new ClientError(response as never, { query: '' });
  return error;
}

describe('graphql-client error handling', () => {
  describe('classifyError', () => {
    it('classifies network errors (TypeError with fetch)', () => {
      const error = new TypeError('Failed to fetch');
      const result = classifyError(error);
      expect(result.type).toBe('NETWORK_ERROR');
      expect(result.message).toContain('Connection error');
    });

    it('classifies generic Errors as network errors', () => {
      const error = new Error('Network timeout');
      const result = classifyError(error);
      expect(result.type).toBe('NETWORK_ERROR');
    });

    it('classifies AUTHENTICATION_ERROR', () => {
      const error = createClientError([
        { message: 'Unauthorized', extensions: { code: 'AUTHENTICATION_ERROR' } },
      ]);
      const result = classifyError(error);
      expect(result.type).toBe(GraphQLErrorCode.AUTHENTICATION_ERROR);
      expect(result.message).toContain('session has expired');
    });

    it('classifies VALIDATION_ERROR with field errors', () => {
      const error = createClientError([
        {
          message: 'Email is invalid',
          extensions: {
            code: 'VALIDATION_ERROR',
            field: 'email',
            details: 'Must be a valid email',
          },
        },
        {
          message: 'Name too long',
          extensions: { code: 'VALIDATION_ERROR', field: 'name', details: 'Max 100 chars' },
        },
      ]);
      const result = classifyError(error);
      expect(result.type).toBe(GraphQLErrorCode.VALIDATION_ERROR);
      expect(result.fieldErrors).toHaveLength(2);
      expect(result.fieldErrors![0]).toEqual({ field: 'email', message: 'Must be a valid email' });
      expect(result.fieldErrors![1]).toEqual({ field: 'name', message: 'Max 100 chars' });
    });

    it('classifies CONFLICT_ERROR with valid transitions', () => {
      const error = createClientError([
        {
          message: 'Conflict',
          extensions: {
            code: 'CONFLICT_ERROR',
            details: 'Candidate was updated by another user',
            validTransitions: ['Rejected'],
          },
        },
      ]);
      const result = classifyError(error);
      expect(result.type).toBe(GraphQLErrorCode.CONFLICT_ERROR);
      expect(result.message).toBe('Candidate was updated by another user');
      expect(result.validTransitions).toEqual(['Rejected']);
    });

    it('classifies RATE_LIMIT_ERROR with retryAfter', () => {
      const error = createClientError([
        { message: 'Rate limited', extensions: { code: 'RATE_LIMIT_ERROR', retryAfter: 30 } },
      ]);
      const result = classifyError(error);
      expect(result.type).toBe(GraphQLErrorCode.RATE_LIMIT_ERROR);
      expect(result.retryAfter).toBe(30);
      expect(result.message).toContain('30 seconds');
    });

    it('classifies NOT_FOUND error', () => {
      const error = createClientError([
        { message: 'Not found', extensions: { code: 'NOT_FOUND', details: 'Candidate not found' } },
      ]);
      const result = classifyError(error);
      expect(result.type).toBe(GraphQLErrorCode.NOT_FOUND);
      expect(result.message).toBe('Candidate not found');
    });

    it('classifies INTERNAL_ERROR for unknown codes', () => {
      const error = createClientError([
        { message: 'Something went wrong', extensions: { code: 'INTERNAL_ERROR' } },
      ]);
      const result = classifyError(error);
      expect(result.type).toBe(GraphQLErrorCode.INTERNAL_ERROR);
      expect(result.message).toContain('internal error');
    });

    it('defaults to INTERNAL_ERROR when no extensions', () => {
      const error = createClientError([{ message: 'Unknown error' }]);
      const result = classifyError(error);
      expect(result.type).toBe(GraphQLErrorCode.INTERNAL_ERROR);
    });
  });

  describe('extractErrorExtensions', () => {
    it('extracts extensions from first error', () => {
      const error = createClientError([
        { message: 'err', extensions: { code: 'VALIDATION_ERROR', field: 'email' } },
      ]);
      const ext = extractErrorExtensions(error);
      expect(ext).toEqual({ code: 'VALIDATION_ERROR', field: 'email' });
    });

    it('returns null for non-ClientError', () => {
      expect(extractErrorExtensions(new Error('plain'))).toBeNull();
      expect(extractErrorExtensions(null)).toBeNull();
      expect(extractErrorExtensions('string')).toBeNull();
    });
  });

  describe('extractAllErrorExtensions', () => {
    it('extracts all extensions from multiple errors', () => {
      const error = createClientError([
        { message: 'err1', extensions: { code: 'VALIDATION_ERROR', field: 'email' } },
        { message: 'err2', extensions: { code: 'VALIDATION_ERROR', field: 'name' } },
        { message: 'err3' }, // no extensions
      ]);
      const exts = extractAllErrorExtensions(error);
      expect(exts).toHaveLength(2);
    });
  });

  describe('type guards', () => {
    it('isAuthenticationError returns true for auth errors', () => {
      const error = createClientError([
        { message: 'Unauth', extensions: { code: 'AUTHENTICATION_ERROR' } },
      ]);
      expect(isAuthenticationError(error)).toBe(true);
    });

    it('isConflictError returns true for conflict errors', () => {
      const error = createClientError([
        { message: 'Conflict', extensions: { code: 'CONFLICT_ERROR' } },
      ]);
      expect(isConflictError(error)).toBe(true);
    });

    it('isRateLimitError returns retryAfter', () => {
      const error = createClientError([
        { message: 'Rate limited', extensions: { code: 'RATE_LIMIT_ERROR', retryAfter: 45 } },
      ]);
      const result = isRateLimitError(error);
      expect(result.limited).toBe(true);
      expect(result.retryAfter).toBe(45);
    });

    it('isValidationError detects validation errors', () => {
      const error = createClientError([
        { message: 'Invalid', extensions: { code: 'VALIDATION_ERROR' } },
      ]);
      expect(isValidationError(error)).toBe(true);
    });

    it('isNetworkError detects TypeError fetch errors', () => {
      expect(isNetworkError(new TypeError('Failed to fetch'))).toBe(true);
      expect(isNetworkError(new TypeError('Cannot read property'))).toBe(false);
    });

    it('isClientError identifies ClientError instances', () => {
      const error = createClientError([{ message: 'test' }]);
      expect(isClientError(error)).toBe(true);
      expect(isClientError(new Error('plain'))).toBe(false);
    });
  });

  describe('handleGraphQLError', () => {
    let dispatchedEvents: CustomEvent[] = [];

    beforeEach(() => {
      dispatchedEvents = [];
      vi.spyOn(window, 'dispatchEvent').mockImplementation((event) => {
        dispatchedEvents.push(event as CustomEvent);
        return true;
      });
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('dispatches toast on NETWORK_ERROR', () => {
      const error = new TypeError('Failed to fetch');
      handleGraphQLError(error);
      expect(dispatchedEvents).toHaveLength(1);
      expect(dispatchedEvents[0].type).toBe('rove-hire:toast');
      expect(dispatchedEvents[0].detail.type).toBe('error');
      expect(dispatchedEvents[0].detail.message).toContain('Connection error');
    });

    it('dispatches toast on CONFLICT_ERROR', () => {
      const error = createClientError([
        {
          message: 'Conflict',
          extensions: { code: 'CONFLICT_ERROR', details: 'Updated by another user' },
        },
      ]);
      handleGraphQLError(error);
      expect(dispatchedEvents).toHaveLength(1);
      expect(dispatchedEvents[0].detail.type).toBe('warning');
    });

    it('dispatches toast with retryAfter on RATE_LIMIT_ERROR', () => {
      const error = createClientError([
        { message: 'Rate limited', extensions: { code: 'RATE_LIMIT_ERROR', retryAfter: 60 } },
      ]);
      handleGraphQLError(error);
      expect(dispatchedEvents).toHaveLength(1);
      expect(dispatchedEvents[0].detail.retryAfter).toBe(60);
    });

    it('redirects on AUTHENTICATION_ERROR', () => {
      const originalLocation = window.location;
      const mockLocation = { ...originalLocation, href: '' };
      Object.defineProperty(window, 'location', {
        value: mockLocation,
        writable: true,
      });

      const error = createClientError([
        { message: 'Unauthorized', extensions: { code: 'AUTHENTICATION_ERROR' } },
      ]);
      handleGraphQLError(error);
      expect(mockLocation.href).toBe('/login');

      Object.defineProperty(window, 'location', {
        value: originalLocation,
        writable: true,
      });
    });

    it('does not dispatch toast on VALIDATION_ERROR', () => {
      const error = createClientError([
        { message: 'Invalid', extensions: { code: 'VALIDATION_ERROR', field: 'email' } },
      ]);
      handleGraphQLError(error);
      expect(dispatchedEvents).toHaveLength(0);
    });

    it('does not dispatch toast on INTERNAL_ERROR', () => {
      const error = createClientError([
        { message: 'Server error', extensions: { code: 'INTERNAL_ERROR' } },
      ]);
      handleGraphQLError(error);
      expect(dispatchedEvents).toHaveLength(0);
    });
  });

  describe('dispatchToast', () => {
    it('dispatches custom event with correct detail', () => {
      const events: CustomEvent[] = [];
      vi.spyOn(window, 'dispatchEvent').mockImplementation((event) => {
        events.push(event as CustomEvent);
        return true;
      });

      dispatchToast('Test message', 'success');
      expect(events).toHaveLength(1);
      expect(events[0].detail).toEqual({ message: 'Test message', type: 'success' });

      vi.restoreAllMocks();
    });
  });
});
