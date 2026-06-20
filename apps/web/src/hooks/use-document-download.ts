/**
 * Hook for fetching pre-signed S3 download URLs for documents.
 *
 * Validates: Requirements 7.7, 7.9
 */

'use client';

import { useMutation } from '@tanstack/react-query';
import { gql } from 'graphql-request';
import { graphqlClient, handleGraphQLError } from '@/lib/graphql-client';
import { showToast } from '@/components/shared';

// ---------------------------------------------------------------------------
// GraphQL Mutation
// ---------------------------------------------------------------------------

const GET_DOCUMENT_URL_MUTATION = gql`
  mutation GetDocumentUrl($documentId: String!) {
    getDocumentUrl(documentId: $documentId)
  }
`;

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useDocumentDownload() {
  const mutation = useMutation({
    mutationFn: async (documentId: string): Promise<string> => {
      const data = await graphqlClient.request<{
        getDocumentUrl: string;
      }>(GET_DOCUMENT_URL_MUTATION, { documentId });
      return data.getDocumentUrl;
    },
    onSuccess: (url) => {
      // Open the pre-signed URL in a new tab for download
      window.open(url, '_blank', 'noopener,noreferrer');
    },
    onError: (error) => {
      handleGraphQLError(error);
      showToast({
        message: 'Unable to download document',
        description: 'The file may be temporarily unavailable. Please try again later.',
        type: 'error',
      });
    },
  });

  return {
    download: mutation.mutate,
    downloadAsync: mutation.mutateAsync,
    isPending: mutation.isPending,
    error: mutation.error,
  };
}
