'use client';

/**
 * Interviews List Page — `/interviews`
 *
 * Displays all interviews sorted by date ascending with:
 * - Candidate name, date, type, interviewer, and status
 * - Schedule Interview dialog with client-side validation
 * - Record Feedback dialog with recommendation and notes
 * - Toast notifications on successful scheduling/feedback
 *
 * Validates: Requirements 6.1, 6.3, 6.4, 6.6, 6.7
 */

import * as React from 'react';
import { CalendarIcon, PlusIcon, MessageSquareIcon } from 'lucide-react';
import { InterviewStatus, InterviewType, Recommendation } from '@rove-hire/shared';
import { useCandidates } from '@/hooks/use-candidates';
import {
  useInterviews,
  useScheduleInterview,
  useRecordFeedback,
} from '@/hooks/use-interviews';
import { useToast } from '@/components/shared/toast';
import { LoadingSkeleton } from '@/components/shared/loading-skeleton';
import { EmptyState } from '@/components/shared/empty-state';
import { ErrorState } from '@/components/shared/error-state';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { ScheduleInterviewForm } from './schedule-interview-form';
import { RecordFeedbackForm } from './record-feedback-form';

// ---------------------------------------------------------------------------
// Status Badge for Interviews
// ---------------------------------------------------------------------------

function InterviewStatusBadge({ status }: { status: InterviewStatus }) {
  const styles: Record<InterviewStatus, string> = {
    [InterviewStatus.Scheduled]:
      'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200',
    [InterviewStatus.Completed]:
      'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200',
    [InterviewStatus.Cancelled]:
      'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        styles[status],
      )}
    >
      {status}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Interview Type Badge
// ---------------------------------------------------------------------------

function InterviewTypeBadge({ type }: { type: InterviewType }) {
  const styles: Record<InterviewType, string> = {
    [InterviewType.Screening]:
      'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-200',
    [InterviewType.Technical]:
      'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        styles[type],
      )}
    >
      {type}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function InterviewsPage() {
  const { data: interviews, isLoading, error, refetch } = useInterviews();
  const [scheduleOpen, setScheduleOpen] = React.useState(false);
  const { data: candidatesData } = useCandidates({ page: 1, pageSize: 200 });
  const [feedbackInterviewId, setFeedbackInterviewId] = React.useState<
    string | null
  >(null);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader onScheduleOpen={() => setScheduleOpen(true)} />
        <LoadingSkeleton variant="list" rows={5} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <PageHeader onScheduleOpen={() => setScheduleOpen(true)} />
        <ErrorState
          message="Failed to load interviews"
          description="We couldn't fetch the interviews. Please try again."
          onRetry={refetch}
        />
      </div>
    );
  }

  if (!interviews || interviews.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader onScheduleOpen={() => setScheduleOpen(true)} />
        <EmptyState
          icon={<CalendarIcon className="h-10 w-10 text-muted-foreground" />}
          title="No interviews scheduled"
          description="Schedule your first interview to get started."
        />
        <ScheduleInterviewDialog
          open={scheduleOpen}
          onOpenChange={setScheduleOpen}
          candidates={candidatesData?.items}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader onScheduleOpen={() => setScheduleOpen(true)} />

      {/* Interview list */}
      <div className="rounded-lg border">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  Candidate
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  Date & Time
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  Type
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  Interviewer
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  Status
                </th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {interviews.map((interview) => (
                <tr
                  key={interview.id}
                  className="border-b last:border-0 transition-colors hover:bg-muted/30"
                >
                  <td className="px-4 py-3 font-medium">
                    {interview.candidate?.name ?? 'Unknown'}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {formatInterviewDate(interview.scheduledAt)}
                  </td>
                  <td className="px-4 py-3">
                    <InterviewTypeBadge type={interview.type} />
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {interview.interviewerName}
                  </td>
                  <td className="px-4 py-3">
                    <InterviewStatusBadge status={interview.status} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    {interview.status === InterviewStatus.Scheduled && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setFeedbackInterviewId(interview.id)}
                        aria-label={`Record feedback for interview with ${interview.candidate?.name}`}
                      >
                        <MessageSquareIcon className="mr-1 h-3.5 w-3.5" />
                        Feedback
                      </Button>
                    )}
                    {interview.status === InterviewStatus.Completed &&
                      interview.recommendation && (
                        <RecommendationBadge
                          recommendation={interview.recommendation}
                        />
                      )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Schedule Interview Dialog */}
      <ScheduleInterviewDialog
        open={scheduleOpen}
        onOpenChange={setScheduleOpen}
        candidates={candidatesData?.items}
      />

      {/* Record Feedback Dialog */}
      <RecordFeedbackDialog
        interviewId={feedbackInterviewId}
        onOpenChange={(open) => {
          if (!open) setFeedbackInterviewId(null);
        }}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function PageHeader({ onScheduleOpen }: { onScheduleOpen: () => void }) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Interviews</h1>
        <p className="text-sm text-muted-foreground">
          Scheduled and completed interviews
        </p>
      </div>
      <Button onClick={onScheduleOpen}>
        <PlusIcon className="mr-2 h-4 w-4" />
        Schedule Interview
      </Button>
    </div>
  );
}

function RecommendationBadge({
  recommendation,
}: {
  recommendation: Recommendation;
}) {
  const styles: Record<Recommendation, string> = {
    [Recommendation.Hire]:
      'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200',
    [Recommendation.NoHire]:
      'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200',
    [Recommendation.Maybe]:
      'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-200',
  };

  const labels: Record<Recommendation, string> = {
    [Recommendation.Hire]: 'Hire',
    [Recommendation.NoHire]: 'No Hire',
    [Recommendation.Maybe]: 'Maybe',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        styles[recommendation],
      )}
    >
      {labels[recommendation]}
    </span>
  );
}

function ScheduleInterviewDialog({
  open,
  onOpenChange,
  candidates,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  candidates?: Array<{ id: string; name: string; email: string }>;
}) {
  const { mutate: scheduleInterview, isPending } = useScheduleInterview();
  const toast = useToast();

  const handleSubmit = React.useCallback(
    (data: {
      candidateId: string;
      type: InterviewType;
      scheduledAt: string;
      interviewerName: string;
      notes?: string;
    }) => {
      scheduleInterview(
        {
          candidateId: data.candidateId,
          type: data.type,
          scheduledAt: data.scheduledAt,
          interviewerName: data.interviewerName,
          notes: data.notes || null,
        },
        {
          onSuccess: () => {
            toast.success('Interview scheduled successfully');
            onOpenChange(false);
          },
        },
      );
    },
    [scheduleInterview, toast, onOpenChange],
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Schedule Interview</DialogTitle>
          <DialogDescription>
            Schedule a new interview for a candidate. All fields marked with *
            are required.
          </DialogDescription>
        </DialogHeader>
        <ScheduleInterviewForm
          onSubmit={handleSubmit}
          isPending={isPending}
          onCancel={() => onOpenChange(false)}
          candidates={candidates}
        />
      </DialogContent>
    </Dialog>
  );
}

function RecordFeedbackDialog({
  interviewId,
  onOpenChange,
}: {
  interviewId: string | null;
  onOpenChange: (open: boolean) => void;
}) {
  const { mutate: recordFeedback, isPending } = useRecordFeedback();
  const toast = useToast();

  const handleSubmit = React.useCallback(
    (data: { recommendation: Recommendation; feedback: string }) => {
      if (!interviewId) return;
      recordFeedback(
        {
          interviewId,
          recommendation: data.recommendation,
          feedback: data.feedback,
        },
        {
          onSuccess: () => {
            toast.success('Feedback recorded successfully');
            onOpenChange(false);
          },
        },
      );
    },
    [interviewId, recordFeedback, toast, onOpenChange],
  );

  return (
    <Dialog open={!!interviewId} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Record Feedback</DialogTitle>
          <DialogDescription>
            Provide your recommendation and notes for this interview.
          </DialogDescription>
        </DialogHeader>
        <RecordFeedbackForm
          onSubmit={handleSubmit}
          isPending={isPending}
          onCancel={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

function formatInterviewDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}
