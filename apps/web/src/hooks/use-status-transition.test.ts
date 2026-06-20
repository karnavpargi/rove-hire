import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CandidateStatus, GraphQLErrorCode } from '@rove-hire/shared';
import { createElement, type ReactNode } from 'react';
import { useStatusTransition } from './use-status-transition';
import * as graphqlClientModule from '@/lib/graphql-client';
import * as optimisticModule from '@/lib/optimistic-updates';

// Mock the graphql client
vi.mock('@/lib/graphql-client', async () => {
  const actual = await vi.importActual<typeof graphqlClientModule>('@/lib/graphql-client');
  return {
    ...actual,
    graphqlClient: {
      request: vi.fn(),
    },
    handleGraphQLError: vi.fn().mockReturnValue({
      type: 'INTERNAL_ERROR',
      message: 'An internal error occurred.',
    }),
  };
});

// Spy on optimistic updates
vi.mock('@/lib/optimistic-updates', async () => {
  const actual = await vi.importActual<typeof optimisticModule>('@/lib/optimistic-updates');
  return {
    ...actual,
    registerOptimisticUpdate: vi.fn(actual.registerOptimisticUpdate),
  };
});

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return function Wrapper({ children }: { children: ReactNode }) {
    return createElement(QueryClientProvider, { client: queryClient }, children);
  };
}

describe('useStatusTransition', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mockRequest = (graphqlClientModule.graphqlClient as any).request as ReturnType<typeof vi.fn>;
  const mockHandleError = vi.mocked(graphqlClientModule.handleGraphQLError);

  beforeEach(() => {
    vi.clearAllMocks();
    optimisticModule.clearAllPendingUpdates();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns transition function and initial state', () => {
    const { result } = renderHook(() => useStatusTransition(), {
      wrapper: createWrapper(),
    });

    expect(typeof result.current.transition).toBe('function');
    expect(typeof result.current.transitionAsync).toBe('function');
    expect(result.current.isPending).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('calls graphqlClient.request with correct mutation variables', async () => {
    mockRequest.mockResolvedValueOnce({
      transitionCandidateStatus: {
        id: 'candidate-1',
        status: CandidateStatus.FormSubmitted,
        lastActivityAt: '2024-01-15T12:00:00Z',
      },
    });

    const { result } = renderHook(() => useStatusTransition(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.transition({
        candidateId: 'candidate-1',
        currentStatus: CandidateStatus.Applied,
        targetStatus: CandidateStatus.FormSubmitted,
      });
    });

    await waitFor(() => {
      expect(mockRequest).toHaveBeenCalledWith(
        expect.any(String),
        {
          input: {
            candidateId: 'candidate-1',
            targetStatus: CandidateStatus.FormSubmitted,
            rejectionReason: undefined,
          },
        }
      );
    });
  });

  it('registers optimistic update before mutation resolves', async () => {
    // Delay the request so we can check optimistic state
    mockRequest.mockImplementation(
      () =>
        new Promise((resolve) =>
          setTimeout(
            () =>
              resolve({
                transitionCandidateStatus: {
                  id: 'candidate-1',
                  status: CandidateStatus.FormSubmitted,
                  lastActivityAt: '2024-01-15T12:00:00Z',
                },
              }),
            50
          )
        )
    );

    const { result } = renderHook(() => useStatusTransition(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.transition({
        candidateId: 'candidate-1',
        currentStatus: CandidateStatus.Applied,
        targetStatus: CandidateStatus.FormSubmitted,
      });
    });

    // Optimistic update should be registered immediately
    await waitFor(() => {
      expect(optimisticModule.registerOptimisticUpdate).toHaveBeenCalledWith(
        'candidate-1',
        CandidateStatus.Applied,
        CandidateStatus.FormSubmitted
      );
    });
  });

  it('calls onSuccess callback on successful transition', async () => {
    const successResult = {
      id: 'candidate-1',
      status: CandidateStatus.OfferSent,
      lastActivityAt: '2024-01-15T12:00:00Z',
    };

    mockRequest.mockResolvedValueOnce({
      transitionCandidateStatus: successResult,
    });

    const onSuccess = vi.fn();
    const { result } = renderHook(
      () => useStatusTransition({ onSuccess }),
      { wrapper: createWrapper() }
    );

    act(() => {
      result.current.transition({
        candidateId: 'candidate-1',
        currentStatus: CandidateStatus.InterviewScheduled,
        targetStatus: CandidateStatus.OfferSent,
      });
    });

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalledWith(successResult);
    });
  });

  it('calls handleGraphQLError and onError on failure', async () => {
    const mockError = new Error('Server error');
    mockRequest.mockRejectedValueOnce(mockError);

    mockHandleError.mockReturnValueOnce({
      type: GraphQLErrorCode.CONFLICT_ERROR,
      message: 'Conflict occurred',
      validTransitions: ['Rejected'],
    });

    const onError = vi.fn();
    const { result } = renderHook(
      () => useStatusTransition({ onError }),
      { wrapper: createWrapper() }
    );

    act(() => {
      result.current.transition({
        candidateId: 'candidate-1',
        currentStatus: CandidateStatus.Applied,
        targetStatus: CandidateStatus.FormSubmitted,
      });
    });

    await waitFor(() => {
      expect(mockHandleError).toHaveBeenCalledWith(mockError, {
        formData: undefined,
        currentPath: undefined,
      });
      expect(onError).toHaveBeenCalledWith(
        expect.objectContaining({ type: GraphQLErrorCode.CONFLICT_ERROR })
      );
    });
  });

  it('passes formData and currentPath to handleGraphQLError on auth error', async () => {
    const mockError = new Error('Unauthorized');
    mockRequest.mockRejectedValueOnce(mockError);

    mockHandleError.mockReturnValueOnce({
      type: GraphQLErrorCode.AUTHENTICATION_ERROR,
      message: 'Session expired',
    });

    const formData = { name: 'John', email: 'john@test.com' };
    const { result } = renderHook(
      () =>
        useStatusTransition({
          formData,
          currentPath: '/candidates/123',
        }),
      { wrapper: createWrapper() }
    );

    act(() => {
      result.current.transition({
        candidateId: 'candidate-1',
        currentStatus: CandidateStatus.Applied,
        targetStatus: CandidateStatus.FormSubmitted,
      });
    });

    await waitFor(() => {
      expect(mockHandleError).toHaveBeenCalledWith(mockError, {
        formData,
        currentPath: '/candidates/123',
      });
    });
  });

  it('includes reason in mutation variables for rejection', async () => {
    mockRequest.mockResolvedValueOnce({
      transitionCandidateStatus: {
        id: 'candidate-1',
        status: CandidateStatus.Rejected,
        lastActivityAt: '2024-01-15T12:00:00Z',
      },
    });

    const { result } = renderHook(() => useStatusTransition(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.transition({
        candidateId: 'candidate-1',
        currentStatus: CandidateStatus.Applied,
        targetStatus: CandidateStatus.Rejected,
        reason: 'Not qualified for the position',
      });
    });

    await waitFor(() => {
      expect(mockRequest).toHaveBeenCalledWith(
        expect.any(String),
        {
          input: {
            candidateId: 'candidate-1',
            targetStatus: CandidateStatus.Rejected,
            rejectionReason: 'Not qualified for the position',
          },
        }
      );
    });
  });
});
