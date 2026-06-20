/**
 * TanStack Query hooks for Interview operations.
 *
 * Provides:
 * - useInterviews: fetch all interviews sorted by date ascending
 * - useScheduleInterview: mutation to schedule a new interview
 * - useRecordFeedback: mutation to record feedback for an interview
 *
 * Validates: Requirements 6.1, 6.3, 6.4, 6.6, 6.7
 */

'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { graphqlClient, handleGraphQLError } from '@/lib/graphql-client';
import {
  INTERVIEWS_QUERY,
  SCHEDULE_INTERVIEW_MUTATION,
  RECORD_FEEDBACK_MUTATION,
} from '@/lib/graphql/interviews';
import type {
  Interview,
  ScheduleInterviewInput,
  RecordFeedbackInput,
} from '@rove-hire/shared';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface InterviewWithCandidate extends Interview {
  candidate?: {
    id: string;
    name: string;
  };
}

// ---------------------------------------------------------------------------
// Query Keys
// ---------------------------------------------------------------------------

export const interviewKeys = {
  all: ['interviews'] as const,
  lists: () => [...interviewKeys.all, 'list'] as const,
};

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

/** Fetch all interviews sorted by scheduledAt ascending. */
export function useInterviews() {
  return useQuery({
    queryKey: interviewKeys.lists(),
    queryFn: async () => {
      const data = await graphqlClient.request<{
        interviews: InterviewWithCandidate[];
      }>(INTERVIEWS_QUERY);
      // Sort by scheduledAt ascending (ensure client-side sort for safety)
      return [...data.interviews].sort(
        (a, b) =>
          new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime(),
      );
    },
  });
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

/** Schedule a new interview and invalidate the interviews list cache. */
export function useScheduleInterview() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: ScheduleInterviewInput) => {
      const data = await graphqlClient.request<{
        scheduleInterview: InterviewWithCandidate;
      }>(SCHEDULE_INTERVIEW_MUTATION, { input });
      return data.scheduleInterview;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: interviewKeys.lists() });
    },
    onError: (error) => {
      handleGraphQLError(error);
    },
  });
}

/** Record feedback for an interview and invalidate the interviews list cache. */
export function useRecordFeedback() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: RecordFeedbackInput) => {
      const data = await graphqlClient.request<{
        recordFeedback: Interview;
      }>(RECORD_FEEDBACK_MUTATION, { input });
      return data.recordFeedback;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: interviewKeys.lists() });
    },
    onError: (error) => {
      handleGraphQLError(error);
    },
  });
}
