/**
 * TanStack Query hooks for Job Opening operations.
 *
 * Provides:
 * - useJobs: fetch all job openings (most recent first)
 * - useJob: fetch a single job opening by ID with candidates
 * - useCreateJob: mutation to create a new job opening
 * - useUpdateJob: mutation to update a job opening
 * - useUpdateJobStatus: mutation to toggle Open/Closed with optimistic update
 *
 * Validates: Requirements 3.1, 3.2, 3.3, 3.5, 3.7, 3.9, 3.10
 */

'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { graphqlClient, handleGraphQLError } from '@/lib/graphql-client';
import {
  JOB_OPENINGS_QUERY,
  JOB_OPENING_QUERY,
  CREATE_JOB_OPENING_MUTATION,
  UPDATE_JOB_OPENING_MUTATION,
  UPDATE_JOB_OPENING_STATUS_MUTATION,
} from '@/lib/graphql/jobs';
import type {
  JobOpening,
  CreateJobOpeningInput,
  UpdateJobOpeningInput,
  JobOpeningStatus,
} from '@rove-hire/shared';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface JobOpeningWithCandidates extends JobOpening {
  candidates?: {
    id: string;
    name: string;
    email: string;
    status: string;
    currentRole?: string | null;
    lastActivityAt: string;
    createdAt: string;
  }[];
}

// ---------------------------------------------------------------------------
// Query Keys
// ---------------------------------------------------------------------------

export const jobKeys = {
  all: ['jobs'] as const,
  lists: () => [...jobKeys.all, 'list'] as const,
  detail: (id: string) => [...jobKeys.all, 'detail', id] as const,
};

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

/** Fetch all job openings with candidate count. */
export function useJobs() {
  return useQuery({
    queryKey: jobKeys.lists(),
    queryFn: async () => {
      const data = await graphqlClient.request<{ jobOpenings: JobOpening[] }>(JOB_OPENINGS_QUERY);
      return data.jobOpenings;
    },
  });
}

/** Fetch a single job opening by ID with associated candidates. */
export function useJob(id: string) {
  return useQuery({
    queryKey: jobKeys.detail(id),
    queryFn: async () => {
      const data = await graphqlClient.request<{ jobOpening: JobOpeningWithCandidates }>(
        JOB_OPENING_QUERY,
        { id },
      );
      return data.jobOpening;
    },
    enabled: !!id,
  });
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

/** Create a new job opening and invalidate the jobs list cache. */
export function useCreateJob() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateJobOpeningInput) => {
      const data = await graphqlClient.request<{ createJobOpening: JobOpening }>(
        CREATE_JOB_OPENING_MUTATION,
        { input },
      );
      return data.createJobOpening;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: jobKeys.lists() });
    },
    onError: (error) => {
      handleGraphQLError(error);
    },
  });
}

/** Update a job opening (title, description, skills, status) and invalidate caches. */
export function useUpdateJob() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdateJobOpeningInput) => {
      const data = await graphqlClient.request<{ updateJobOpening: JobOpening }>(
        UPDATE_JOB_OPENING_MUTATION,
        { input },
      );
      return data.updateJobOpening;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: jobKeys.lists() });
      queryClient.invalidateQueries({ queryKey: jobKeys.detail(data.id) });
    },
    onError: (error) => {
      handleGraphQLError(error);
    },
  });
}

/**
 * Toggle a job opening's status (Open ↔ Closed) with optimistic update.
 * The UI reflects the change immediately; if the server rejects,
 * the previous status is restored.
 */
export function useUpdateJobStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: JobOpeningStatus }) => {
      const data = await graphqlClient.request<{
        updateJobOpeningStatus: { id: string; status: JobOpeningStatus; updatedAt: string };
      }>(UPDATE_JOB_OPENING_STATUS_MUTATION, { input: { id, status } });
      return data.updateJobOpeningStatus;
    },
    onMutate: async ({ id, status }) => {
      // Cancel outgoing fetches to avoid overwriting our optimistic update
      await queryClient.cancelQueries({ queryKey: jobKeys.lists() });
      await queryClient.cancelQueries({ queryKey: jobKeys.detail(id) });

      // Snapshot current data
      const previousJobs = queryClient.getQueryData<JobOpening[]>(jobKeys.lists());
      const previousJob = queryClient.getQueryData<JobOpeningWithCandidates>(jobKeys.detail(id));

      // Optimistically update the list
      if (previousJobs) {
        queryClient.setQueryData<JobOpening[]>(jobKeys.lists(), (old) =>
          old?.map((j) => (j.id === id ? { ...j, status } : j)),
        );
      }

      // Optimistically update the detail
      if (previousJob) {
        queryClient.setQueryData<JobOpeningWithCandidates>(jobKeys.detail(id), {
          ...previousJob,
          status,
        });
      }

      return { previousJobs, previousJob };
    },
    onError: (error, { id }, context) => {
      // Revert on error
      if (context?.previousJobs) {
        queryClient.setQueryData(jobKeys.lists(), context.previousJobs);
      }
      if (context?.previousJob) {
        queryClient.setQueryData(jobKeys.detail(id), context.previousJob);
      }
      handleGraphQLError(error);
    },
    onSettled: (_, __, { id }) => {
      // Refetch to ensure consistency
      queryClient.invalidateQueries({ queryKey: jobKeys.lists() });
      queryClient.invalidateQueries({ queryKey: jobKeys.detail(id) });
    },
  });
}
