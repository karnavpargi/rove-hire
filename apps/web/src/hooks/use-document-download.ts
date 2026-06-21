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
// GraphQL query (pre-signed URL fetch)
// ---------------------------------------------------------------------------

const GET_DOCUMENT_URL_QUERY = gql`
  query DocumentUrl($id: String!) {
    documentUrl(id: $id)
  }
`;

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useDocumentDownload() {
  const mutation = useMutation({
    mutationFn: async (documentId: string): Promise<string> => {
      const data = await graphqlClient.request<{
        documentUrl: string;
      }>(GET_DOCUMENT_URL_QUERY, { id: documentId });
      return data.documentUrl;
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
