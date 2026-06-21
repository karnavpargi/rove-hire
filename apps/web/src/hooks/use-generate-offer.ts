/**
 * Hook for generating offer documents (offer letter + NDA) via GraphQL mutation.
 *
 * Handles the full lifecycle:
 * - Calls generateOfferDocuments mutation
 * - Manages loading state (generation can take up to 10s)
 * - Returns download URLs on success
 * - Classifies errors for UI display
 *
 * Validates: Requirements 8.1, 8.2, 8.10, 8.11, 12.3, 12.4
 */

'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { gql } from 'graphql-request';
import { graphqlClient, handleGraphQLError, classifyError } from '@/lib/graphql-client';
import type { ClassifiedError } from '@/lib/graphql-client';

// ---------------------------------------------------------------------------
// GraphQL Mutation
// ---------------------------------------------------------------------------

const GENERATE_OFFER_MUTATION = gql`
  mutation GenerateOfferDocuments($input: GenerateOfferInput!) {
    generateOfferDocuments(input: $input) {
      offerLetterUrl
      ndaUrl
      offerLetterId
      ndaId
    }
  }
`;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface GenerateOfferInput {
  candidateId: string;
  roleTitle: string;
  salaryCurrency: string;
  salaryAmount: number;
  startDate: string;
  reportingManager: string;
  location: string;
}

export interface GenerateOfferResult {
  offerLetterUrl: string;
  ndaUrl: string;
  offerLetterId: string;
  ndaId: string;
}

export interface UseGenerateOfferOptions {
  /** Callback on successful generation */
  onSuccess?: (result: GenerateOfferResult) => void;
  /** Callback on failed generation */
  onError?: (error: ClassifiedError) => void;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useGenerateOffer(options?: UseGenerateOfferOptions) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (input: GenerateOfferInput): Promise<GenerateOfferResult> => {
      const data = await graphqlClient.request<{
        generateOfferDocuments: GenerateOfferResult;
      }>(GENERATE_OFFER_MUTATION, { input });
      return data.generateOfferDocuments;
    },
    onSuccess: (result, input) => {
      // Invalidate candidate query to refetch with new documents and status
      queryClient.invalidateQueries({ queryKey: ['candidate', input.candidateId] });
      queryClient.invalidateQueries({ queryKey: ['candidates'] });

      options?.onSuccess?.(result);
    },
    onError: (error) => {
      const classified = handleGraphQLError(error);
      options?.onError?.(classified);
    },
  });

  return {
    /** Trigger offer document generation */
    generate: mutation.mutate,
    /** Trigger offer document generation (async version) */
    generateAsync: mutation.mutateAsync,
    /** Whether generation is currently in-flight */
    isPending: mutation.isPending,
    /** The last error if generation failed */
    error: mutation.error,
    /** The result data from the last successful generation */
    data: mutation.data,
    /** Reset the mutation state */
    reset: mutation.reset,
  };
}
