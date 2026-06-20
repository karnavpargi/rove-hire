/**
 * Hook for candidate status transitions with optimistic updates.
 *
 * Integrates TanStack Query mutations with the optimistic update system
 * to provide immediate UI feedback (within 100ms) and automatic rollback
 * on server rejection (within 2s).
 *
 * Validates: Requirements 12.5, 12.6, 17.3, 17.6
 */

'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { gql } from 'graphql-request';
import { CandidateStatus } from '@rove-hire/shared';
import { graphqlClient, handleGraphQLError, classifyError } from '@/lib/graphql-client';
import {
  registerOptimisticUpdate,
  type OptimisticUpdateResult,
} from '@/lib/optimistic-updates';

// ---------------------------------------------------------------------------
// GraphQL Mutation
// ---------------------------------------------------------------------------

const TRANSITION_STATUS_MUTATION = gql`
  mutation TransitionCandidateStatus($input: UpdateCandidateStatusInput!) {
    transitionCandidateStatus(input: $input) {
      id
      status
      lastActivityAt
    }
  }
`;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TransitionInput {
  candidateId: string;
  currentStatus: CandidateStatus;
  targetStatus: CandidateStatus;
  reason?: string;
}

export interface TransitionResult {
  id: string;
  status: CandidateStatus;
  lastActivityAt: string;
}

export interface UseStatusTransitionOptions {
  /** Form data to persist if a 401 occurs during the transition */
  formData?: Record<string, unknown>;
  /** Current path for form data persistence */
  currentPath?: string;
  /** Callback on successful transition */
  onSuccess?: (result: TransitionResult) => void;
  /** Callback on failed transition (after rollback) */
  onError?: (error: ReturnType<typeof classifyError>) => void;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useStatusTransition(options?: UseStatusTransitionOptions) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (input: TransitionInput): Promise<TransitionResult> => {
      const data = await graphqlClient.request<{
        transitionCandidateStatus: TransitionResult;
      }>(TRANSITION_STATUS_MUTATION, {
        input: {
          candidateId: input.candidateId,
          targetStatus: input.targetStatus,
          rejectionReason: input.reason,
        },
      });
      return data.transitionCandidateStatus;
    },
    onMutate: async (input: TransitionInput) => {
      // Cancel in-flight queries for this candidate to avoid overwriting optimistic state
      await queryClient.cancelQueries({
        queryKey: ['candidate', input.candidateId],
      });
      await queryClient.cancelQueries({
        queryKey: ['candidates'],
      });

      // Register the optimistic update (UI updates within 100ms)
      const optimistic = registerOptimisticUpdate(
        input.candidateId,
        input.currentStatus,
        input.targetStatus
      );

      return { optimistic };
    },
    onSuccess: (result, _input, context) => {
      // Server confirmed — finalize optimistic update
      context?.optimistic?.confirm();

      // Invalidate queries to refetch latest data
      queryClient.invalidateQueries({ queryKey: ['candidates'] });
      queryClient.invalidateQueries({ queryKey: ['candidate', result.id] });

      options?.onSuccess?.(result);
    },
    onError: (error, input, context) => {
      // Server rejected — rollback optimistic update (within 2s)
      context?.optimistic?.rollback();

      // Handle the error (toast, redirect, etc.)
      const classified = handleGraphQLError(error, {
        formData: options?.formData,
        currentPath: options?.currentPath,
      });

      options?.onError?.(classified);
    },
  });

  return {
    /** Trigger a status transition with optimistic update */
    transition: mutation.mutate,
    /** Trigger a status transition (async version) */
    transitionAsync: mutation.mutateAsync,
    /** Whether a transition is currently in-flight */
    isPending: mutation.isPending,
    /** The last error if the transition failed */
    error: mutation.error,
    /** Reset the mutation state */
    reset: mutation.reset,
  };
}
