/**
 * TanStack Query hook for fetching a single candidate with full profile data,
 * including timeline events, documents, and interviews.
 *
 * Validates: Requirements 7.1, 7.2, 7.3, 7.4, 7.5, 9.5
 */

'use client';

import { useQuery } from '@tanstack/react-query';
import { gql } from 'graphql-request';
import { graphqlClient } from '@/lib/graphql-client';
import type { Candidate, TimelineEvent, Document, Interview } from '@rove-hire/shared';

// ---------------------------------------------------------------------------
// GraphQL Query
// ---------------------------------------------------------------------------

const CANDIDATE_QUERY = gql`
  query Candidate($id: String!) {
    candidate(id: $id) {
      id
      name
      email
      phone
      location
      currentRole
      noticePeriod
      salaryExpectation
      linkedinUrl
      status
      rejectionReason
      jobOpeningId
      lastActivityAt
      createdAt
      updatedAt
      documents {
        id
        type
        s3Key
        originalFilename
        fileSizeBytes
        createdAt
      }
      interviews {
        id
        type
        scheduledAt
        interviewerName
        notes
        status
        recommendation
        feedback
        completedAt
        createdAt
        updatedAt
      }
      timelineEvents {
        id
        eventType
        previousStatus
        newStatus
        details
        actorId
        createdAt
      }
    }
  }
`;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CandidateProfile extends Candidate {
  documents: Document[];
  interviews: Interview[];
  timelineEvents: TimelineEvent[];
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useCandidate(id: string | undefined) {
  return useQuery<CandidateProfile>({
    queryKey: ['candidate', id],
    queryFn: async () => {
      const data = await graphqlClient.request<{
        candidate: CandidateProfile;
      }>(CANDIDATE_QUERY, { id });
      return data.candidate;
    },
    enabled: !!id,
    staleTime: 15_000, // 15 seconds
    retry: 1,
  });
}
