'use client';

/**
 * Job Detail Page — `/jobs/[id]`
 *
 * Displays a single job opening with:
 * - Title, status, description, skills tags
 * - Status toggle (Open ↔ Closed) with optimistic update
 * - Associated candidates list
 *
 * Validates: Requirements 3.5, 3.9, 3.10
 */

import * as React from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeftIcon,
  BriefcaseIcon,
  CalendarIcon,
  UsersIcon,
} from 'lucide-react';
import { JobOpeningStatus } from '@rove-hire/shared';
import type { CandidateStatus } from '@rove-hire/shared';
import { useJob, useUpdateJobStatus } from '@/hooks/use-jobs';
import { useToast } from '@/components/shared/toast';
import { LoadingSkeleton } from '@/components/shared/loading-skeleton';
import { EmptyState } from '@/components/shared/empty-state';
import { ErrorState } from '@/components/shared/error-state';
import { StatusBadge } from '@/components/shared/status-badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/** Status badge for job opening (Open/Closed) */
function JobStatusBadge({ status }: { status: JobOpeningStatus }) {
  const isOpen = status === JobOpeningStatus.Open;
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-3 py-1 text-sm font-medium',
        isOpen
          ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200'
          : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
      )}
    >
      {isOpen ? 'Open' : 'Closed'}
    </span>
  );
}

export default function JobDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const { data: job, isLoading, error, refetch } = useJob(id);
  const { mutate: updateStatus, isPending: isUpdatingStatus } = useUpdateJobStatus();
  const toast = useToast();

  const handleStatusToggle = React.useCallback(() => {
    if (!job) return;

    const newStatus =
      job.status === JobOpeningStatus.Open
        ? JobOpeningStatus.Closed
        : JobOpeningStatus.Open;

    updateStatus(
      { id: job.id, status: newStatus },
      {
        onSuccess: () => {
          toast.success(
            `Job ${newStatus === JobOpeningStatus.Open ? 'reopened' : 'closed'} successfully`,
          );
        },
      },
    );
  }, [job, updateStatus, toast]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <LoadingSkeleton variant="profile" />
      </div>
    );
  }

  if (error || !job) {
    return (
      <ErrorState
        message="Job not found"
        description="We couldn't find this job opening or it may have been removed."
        onRetry={refetch}
      />
    );
  }

  return (
    <div className="space-y-8">
      {/* Navigation */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/jobs" aria-label="Back to jobs">
            <ArrowLeftIcon className="h-4 w-4" />
          </Link>
        </Button>
        <nav aria-label="Breadcrumb" className="text-sm text-muted-foreground">
          <ol className="flex items-center gap-1.5">
            <li>
              <Link href="/jobs" className="hover:text-foreground">
                Jobs
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li className="font-medium text-foreground truncate max-w-[200px]">
              {job.title}
            </li>
          </ol>
        </nav>
      </div>

      {/* Job header */}
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <BriefcaseIcon className="h-6 w-6 text-muted-foreground" />
            <h1 className="text-2xl font-bold tracking-tight">{job.title}</h1>
          </div>
          <div className="flex items-center gap-4">
            <JobStatusBadge status={job.status} />
            <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
              <UsersIcon className="h-4 w-4" />
              {job.candidateCount ?? 0} candidate{(job.candidateCount ?? 0) !== 1 ? 's' : ''}
            </span>
            <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
              <CalendarIcon className="h-4 w-4" />
              Created {new Date(job.createdAt).toLocaleDateString()}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Edit button */}
          <Button variant="outline" asChild>
            <Link href={`/jobs/${job.id}/edit`}>Edit</Link>
          </Button>

          {/* Status toggle button */}
          <Button
            variant={job.status === JobOpeningStatus.Open ? 'outline' : 'default'}
            onClick={handleStatusToggle}
            disabled={isUpdatingStatus}
          >
            {isUpdatingStatus
              ? 'Updating...'
              : job.status === JobOpeningStatus.Open
                ? 'Close Job'
                : 'Reopen Job'}
          </Button>
        </div>
      </div>

      {/* Skills tags */}
      {job.skills && job.skills.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-medium text-muted-foreground">Skills</h2>
          <div className="flex flex-wrap gap-2">
            {job.skills.map((skill) => (
              <span
                key={skill.id}
                className="inline-flex items-center rounded-md bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary"
              >
                {skill.tag}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Description */}
      {job.description && (
        <div className="space-y-2">
          <h2 className="text-sm font-medium text-muted-foreground">Description</h2>
          <div className="rounded-lg border p-4">
            <MarkdownContent content={job.description} />
          </div>
        </div>
      )}

      {/* Associated candidates */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Candidates</h2>
          {job.status === JobOpeningStatus.Open && (
            <Button size="sm" variant="outline" asChild>
              <Link href={`/candidates/new?jobId=${job.id}`}>Add Candidate</Link>
            </Button>
          )}
        </div>

        {!job.candidates || job.candidates.length === 0 ? (
          <EmptyState
            icon={<UsersIcon className="h-10 w-10 text-muted-foreground" />}
            title="No candidates yet"
            description={
              job.status === JobOpeningStatus.Open
                ? 'Add a candidate to get started with this job opening.'
                : 'This job is closed and not accepting new candidates.'
            }
            actionHref={
              job.status === JobOpeningStatus.Open
                ? `/candidates/new?jobId=${job.id}`
                : undefined
            }
            actionLabel={
              job.status === JobOpeningStatus.Open ? 'Add Candidate' : undefined
            }
          />
        ) : (
          <div className="space-y-2">
            {job.candidates.map((candidate) => (
              <Link
                key={candidate.id}
                href={`/candidates/${candidate.id}`}
                className="flex items-center justify-between rounded-lg border p-4 transition-colors hover:bg-muted/50"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{candidate.name}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {candidate.currentRole || candidate.email}
                  </p>
                </div>
                <div className="flex items-center gap-3 ml-4">
                  <StatusBadge status={candidate.status as CandidateStatus} />
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {formatRelativeTime(candidate.lastActivityAt)}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/** Simple markdown renderer for job description preview */
function MarkdownContent({ content }: { content: string }) {
  const html = React.useMemo(() => {
    let result = content
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    // Code blocks
    result = result.replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>');
    result = result.replace(/`([^`]+)`/g, '<code class="bg-muted px-1 rounded text-xs">$1</code>');

    // Headings
    result = result.replace(/^### (.+)$/gm, '<h3 class="text-base font-semibold mt-3 mb-1">$1</h3>');
    result = result.replace(/^## (.+)$/gm, '<h2 class="text-lg font-semibold mt-3 mb-1">$1</h2>');
    result = result.replace(/^# (.+)$/gm, '<h1 class="text-xl font-bold mt-3 mb-2">$1</h1>');

    // Bold/Italic
    result = result.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    result = result.replace(/\*(.+?)\*/g, '<em>$1</em>');

    // Links
    result = result.replace(
      /\[([^\]]+)\]\(([^)]+)\)/g,
      '<a href="$2" class="text-primary underline" target="_blank" rel="noopener noreferrer">$1</a>',
    );

    // Lists
    result = result.replace(/^[-*] (.+)$/gm, '<li class="ml-4 list-disc">$1</li>');
    result = result.replace(/\n\n/g, '</p><p class="my-2">');
    result = `<p class="my-2">${result}</p>`;
    result = result.replace(/\n/g, '<br/>');

    return result;
  }, [content]);

  return (
    <div
      className="prose prose-sm dark:prose-invert max-w-none text-sm"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

/** Format timestamp to relative time (e.g., "2 days ago") */
function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / 60_000);
  const diffHours = Math.floor(diffMs / 3_600_000);
  const diffDays = Math.floor(diffMs / 86_400_000);

  if (diffMinutes < 1) return 'just now';
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 30) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}
