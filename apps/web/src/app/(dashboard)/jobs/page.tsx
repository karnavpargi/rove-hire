'use client';

/**
 * Jobs List Page — `/jobs`
 *
 * Displays all job openings with title, status badge, and candidate count.
 * Ordered by most recently created first.
 * Includes status toggle (Open ↔ Closed) with optimistic updates.
 *
 * Validates: Requirements 3.1, 3.2, 3.5, 3.9, 3.10
 */

import * as React from 'react';
import Link from 'next/link';
import { PlusIcon, BriefcaseIcon, UsersIcon } from 'lucide-react';
import { JobOpeningStatus } from '@rove-hire/shared';
import { useJobs, useUpdateJobStatus } from '@/hooks/use-jobs';
import { useToast } from '@/components/shared/toast';
import { LoadingSkeleton } from '@/components/shared/loading-skeleton';
import { EmptyState } from '@/components/shared/empty-state';
import { ErrorState } from '@/components/shared/error-state';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/** Status badge specifically for job openings (Open/Closed). */
function JobStatusBadge({ status }: { status: JobOpeningStatus }) {
  const isOpen = status === JobOpeningStatus.Open;
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        isOpen
          ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200'
          : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
      )}
    >
      {isOpen ? 'Open' : 'Closed'}
    </span>
  );
}

/** Status toggle switch for Open ↔ Closed with optimistic update. */
function StatusToggle({
  id,
  status,
}: {
  id: string;
  status: JobOpeningStatus;
}) {
  const { mutate: updateStatus, isPending } = useUpdateJobStatus();
  const toast = useToast();

  const handleToggle = React.useCallback(() => {
    const newStatus =
      status === JobOpeningStatus.Open
        ? JobOpeningStatus.Closed
        : JobOpeningStatus.Open;

    updateStatus(
      { id, status: newStatus },
      {
        onSuccess: () => {
          toast.success(
            `Job ${newStatus === JobOpeningStatus.Open ? 'reopened' : 'closed'} successfully`,
          );
        },
      },
    );
  }, [id, status, updateStatus, toast]);

  const isOpen = status === JobOpeningStatus.Open;

  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        handleToggle();
      }}
      disabled={isPending}
      className={cn(
        'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        'disabled:cursor-not-allowed disabled:opacity-50',
        isOpen ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600',
      )}
      role="switch"
      aria-checked={isOpen}
      aria-label={`Toggle job status, currently ${isOpen ? 'open' : 'closed'}`}
    >
      <span
        className={cn(
          'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out',
          isOpen ? 'translate-x-5' : 'translate-x-0',
        )}
      />
    </button>
  );
}

export default function JobsPage() {
  const { data: jobs, isLoading, error, refetch } = useJobs();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader />
        <LoadingSkeleton variant="list" rows={5} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <PageHeader />
        <ErrorState
          message="Failed to load jobs"
          description="We couldn't fetch the job openings. Please try again."
          onRetry={refetch}
        />
      </div>
    );
  }

  if (!jobs || jobs.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader />
        <EmptyState
          icon={<BriefcaseIcon className="h-10 w-10 text-muted-foreground" />}
          title="No job openings"
          description="Create your first job opening to start receiving candidates."
          actionHref="/jobs/new"
          actionLabel="Create Job"
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader />

      {/* Job list */}
      <div className="space-y-2">
        {jobs.map((job) => (
          <Link
            key={job.id}
            href={`/jobs/${job.id}`}
            className="flex items-center justify-between rounded-lg border p-4 transition-colors hover:bg-muted/50"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3">
                <h3 className="text-sm font-medium truncate">{job.title}</h3>
                <JobStatusBadge status={job.status} />
              </div>
              <div className="mt-1 flex items-center gap-4 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <UsersIcon className="h-3 w-3" />
                  {job.candidateCount ?? 0} candidate{(job.candidateCount ?? 0) !== 1 ? 's' : ''}
                </span>
                <span>
                  Created {new Date(job.createdAt).toLocaleDateString()}
                </span>
              </div>
            </div>

            {/* Status toggle */}
            <div className="ml-4 shrink-0">
              <StatusToggle id={job.id} status={job.status} />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

/** Page header with title and "Create Job" button. */
function PageHeader() {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Job Openings</h1>
        <p className="text-sm text-muted-foreground">
          Manage your open positions and track candidates
        </p>
      </div>
      <Button asChild>
        <Link href="/jobs/new">
          <PlusIcon className="mr-2 h-4 w-4" />
          Create Job
        </Link>
      </Button>
    </div>
  );
}
