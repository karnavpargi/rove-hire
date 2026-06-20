/**
 * TanStack Query hook for fetching paginated, filtered, and searchable candidates.
 *
 * Validates: Requirements 2.1, 2.2, 2.3, 2.6
 */

'use client';

import { useQuery } from '@tanstack/react-query';
import { gql } from 'graphql-request';
import { graphqlClient } from '@/lib/graphql-client';
import type { Candidate, CandidateStatus, PaginatedResult } from '@rove-hire/shared';

// ---------------------------------------------------------------------------
// GraphQL Query
// ---------------------------------------------------------------------------

const CANDIDATES_QUERY = gql`
  query Candidates($filters: CandidateFiltersInput) {
    candidates(filters: $filters) {
      items {
        id
        name
        email
        currentRole
        status
        lastActivityAt
        jobOpeningId
      }
      total
      page
      pageSize
      totalPages
      hasNextPage
      hasPreviousPage
    }
  }
`;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface UseCandidatesParams {
  page?: number;
  pageSize?: number;
  statuses?: CandidateStatus[];
  search?: string;
  sortBy?: 'lastActivity';
  sortOrder?: 'asc' | 'desc';
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useCandidates(params: UseCandidatesParams = {}) {
  const {
    page = 1,
    pageSize = 20,
    statuses,
    search,
    sortBy = 'lastActivity',
    sortOrder = 'desc',
  } = params;

  // Only include search if it meets minimum length requirement (2 chars)
  const effectiveSearch = search && search.length >= 2 ? search : undefined;

  return useQuery<PaginatedResult<Candidate>>({
    queryKey: [
      'candidates',
      { page, pageSize, statuses, search: effectiveSearch, sortBy, sortOrder },
    ],
    queryFn: async () => {
      const data = await graphqlClient.request<{
        candidates: PaginatedResult<Candidate>;
      }>(CANDIDATES_QUERY, {
        filters: {
          page,
          pageSize,
          statuses: statuses && statuses.length > 0 ? statuses : undefined,
          search: effectiveSearch,
        },
      });
      return data.candidates;
    },
    staleTime: 30_000, // 30 seconds
    placeholderData: (previousData) => previousData, // Keep previous data while refetching
  });
}
