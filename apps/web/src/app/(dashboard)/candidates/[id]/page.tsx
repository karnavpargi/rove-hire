/**
 * Candidate Profile Page
 *
 * Displays full candidate details including:
 * - Profile info (name, email, phone, location, role)
 * - Status badge with animated transitions (150-400ms)
 * - Resume download via pre-signed S3 URL
 * - Document download links (offer/NDA PDFs)
 * - Vertical timeline (max 50 events, most-recent-first)
 * - Contextual action buttons based on status
 * - Rejection dialog with reason (5-500 chars)
 * - Offer generation form (triggered via ?action=generate-offer)
 *
 * Validates: Requirements 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 7.8, 7.9, 7.10,
 *            8.1, 8.2, 8.8, 8.10, 8.11, 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7, 9.8,
 *            12.3, 12.4, 19.2, 19.5
 */

'use client';

import * as React from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import {
  MailIcon,
  PhoneIcon,
  MapPinIcon,
  BriefcaseIcon,
  FileTextIcon,
  DownloadIcon,
  CheckCircleIcon,
  XCircleIcon,
  CalendarIcon,
  MessageSquareIcon,
  FileIcon,
  UserPlusIcon,
  SendIcon,
  AlertCircleIcon,
} from 'lucide-react';
import {
  CandidateStatus,
  InterviewStatus,
  DocumentType,
  TimelineEventType,
} from '@rove-hire/shared';
import type { TimelineEvent } from '@rove-hire/shared';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  StatusBadge,
  LoadingSkeleton,
  ErrorState,
  showToast,
} from '@/components/shared';
import { OfferGenerationForm } from '@/components/offer-generation-form';
import { useCandidate } from '@/hooks/use-candidate';
import { useStatusTransition } from '@/hooks/use-status-transition';
import { useDocumentDownload } from '@/hooks/use-document-download';
import { classifyError } from '@/lib/graphql-client';
import { cn } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TERMINAL_STATUSES: CandidateStatus[] = [
  CandidateStatus.Hired,
  CandidateStatus.Rejected,
];

const TIMELINE_MAX_EVENTS = 50;

const REJECTION_REASON_MIN = 5;
const REJECTION_REASON_MAX = 500;

// ---------------------------------------------------------------------------
// Timeline event icon mapping
// ---------------------------------------------------------------------------

function getTimelineIcon(eventType: TimelineEventType) {
  switch (eventType) {
    case TimelineEventType.StatusChange:
      return <CheckCircleIcon className="h-4 w-4" />;
    case TimelineEventType.InterviewScheduled:
      return <CalendarIcon className="h-4 w-4" />;
    case TimelineEventType.FeedbackSubmitted:
      return <MessageSquareIcon className="h-4 w-4" />;
    case TimelineEventType.OfferGenerated:
      return <FileTextIcon className="h-4 w-4" />;
    case TimelineEventType.RejectionRecorded:
      return <XCircleIcon className="h-4 w-4" />;
    case TimelineEventType.ApplicationSubmitted:
      return <UserPlusIcon className="h-4 w-4" />;
    default:
      return <FileIcon className="h-4 w-4" />;
  }
}

function getTimelineIconColor(eventType: TimelineEventType) {
  switch (eventType) {
    case TimelineEventType.StatusChange:
      return 'bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-300';
    case TimelineEventType.InterviewScheduled:
      return 'bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-300';
    case TimelineEventType.FeedbackSubmitted:
      return 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-300';
    case TimelineEventType.OfferGenerated:
      return 'bg-purple-100 text-purple-600 dark:bg-purple-900/40 dark:text-purple-300';
    case TimelineEventType.RejectionRecorded:
      return 'bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-300';
    case TimelineEventType.ApplicationSubmitted:
      return 'bg-green-100 text-green-600 dark:bg-green-900/40 dark:text-green-300';
    default:
      return 'bg-gray-100 text-gray-600 dark:bg-gray-900/40 dark:text-gray-300';
  }
}

// ---------------------------------------------------------------------------
// Timeline Event Label
// ---------------------------------------------------------------------------

function getTimelineLabel(event: TimelineEvent): string {
  switch (event.eventType as TimelineEventType) {
    case TimelineEventType.StatusChange:
      return `Status changed from ${event.previousStatus ?? 'unknown'} to ${event.newStatus ?? 'unknown'}`;
    case TimelineEventType.InterviewScheduled:
      return 'Interview scheduled';
    case TimelineEventType.FeedbackSubmitted:
      return 'Interview feedback submitted';
    case TimelineEventType.OfferGenerated:
      return 'Offer documents generated';
    case TimelineEventType.RejectionRecorded:
      return 'Candidate rejected';
    case TimelineEventType.ApplicationSubmitted:
      return 'Application submitted';
    default:
      return event.details ?? 'Event recorded';
  }
}

// ---------------------------------------------------------------------------
// Page Component
// ---------------------------------------------------------------------------

export default function CandidateProfilePage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const candidateId = params?.id as string | undefined;

  // Check if we should show the offer generation form
  const showOfferForm = searchParams?.get('action') === 'generate-offer';

  // Data fetching
  const {
    data: candidate,
    isLoading,
    error,
    refetch,
  } = useCandidate(candidateId);

  // Status transition hook
  const { transition, isPending: isTransitioning } = useStatusTransition({
    onSuccess: () => {
      showToast({ message: 'Status updated successfully', type: 'success' });
      refetch();
    },
    onError: (classified) => {
      showToast({ message: classified.message, type: 'error' });
    },
  });

  // Document download hook
  const { download: downloadDocument, isPending: isDownloading } =
    useDocumentDownload();

  // Rejection dialog state
  const [rejectionDialogOpen, setRejectionDialogOpen] = React.useState(false);
  const [rejectionReason, setRejectionReason] = React.useState('');
  const [rejectionReasonError, setRejectionReasonError] = React.useState('');

  // Not found timeout
  const [showNotFound, setShowNotFound] = React.useState(false);

  React.useEffect(() => {
    if (error) {
      const classified = classifyError(error);
      if (classified.type === 'NOT_FOUND') {
        setShowNotFound(true);
        return;
      }
    }
    // If loading takes longer than 3s without data, show not found
    const timer = setTimeout(() => {
      if (!candidate && !isLoading) {
        setShowNotFound(true);
      }
    }, 3000);
    return () => clearTimeout(timer);
  }, [error, candidate, isLoading]);

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  const handleReject = () => {
    setRejectionReason('');
    setRejectionReasonError('');
    setRejectionDialogOpen(true);
  };

  const handleConfirmReject = () => {
    const trimmed = rejectionReason.trim();
    if (trimmed.length < REJECTION_REASON_MIN) {
      setRejectionReasonError(
        `Reason must be at least ${REJECTION_REASON_MIN} characters`,
      );
      return;
    }
    if (trimmed.length > REJECTION_REASON_MAX) {
      setRejectionReasonError(
        `Reason must be at most ${REJECTION_REASON_MAX} characters`,
      );
      return;
    }

    if (!candidate) return;

    transition({
      candidateId: candidate.id,
      currentStatus: candidate.status,
      targetStatus: CandidateStatus.Rejected,
      reason: trimmed,
    });
    setRejectionDialogOpen(false);
  };

  const handleMarkAsHired = () => {
    if (!candidate) return;
    transition({
      candidateId: candidate.id,
      currentStatus: candidate.status,
      targetStatus: CandidateStatus.Hired,
    });
  };

  const handleGenerateOffer = () => {
    if (!candidate) return;
    // Navigate to the offer generation form (task 19.3)
    router.push(`/candidates/${candidate.id}?action=generate-offer`);
  };

  // ---------------------------------------------------------------------------
  // Render: Loading
  // ---------------------------------------------------------------------------

  if (isLoading) {
    return (
      <div className="mx-auto max-w-4xl p-6">
        <LoadingSkeleton variant="profile" />
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Render: Not Found
  // ---------------------------------------------------------------------------

  if (showNotFound || (!candidate && !isLoading)) {
    return (
      <div className="mx-auto max-w-4xl p-6">
        <ErrorState
          message="Candidate not found"
          description="The candidate you're looking for doesn't exist or may have been removed."
          onRetry={() => {
            setShowNotFound(false);
            refetch();
          }}
        />
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Render: Error (non-404)
  // ---------------------------------------------------------------------------

  if (error && !showNotFound) {
    return (
      <div className="mx-auto max-w-4xl p-6">
        <ErrorState
          message="Failed to load candidate"
          description="An error occurred while loading the candidate profile."
          onRetry={() => refetch()}
        />
      </div>
    );
  }

  if (!candidate) return null;

  // ---------------------------------------------------------------------------
  // Derived data
  // ---------------------------------------------------------------------------

  const resume = candidate.documents.find(
    (d) => d.type === DocumentType.Resume,
  );
  const offerLetter = candidate.documents.find(
    (d) => d.type === DocumentType.OfferLetter,
  );
  const nda = candidate.documents.find((d) => d.type === DocumentType.Nda);

  const hasCompletedInterview = candidate.interviews.some(
    (i) => i.status === InterviewStatus.Completed && i.feedback,
  );

  const isTerminal = TERMINAL_STATUSES.includes(candidate.status);

  const timelineEvents = candidate.timelineEvents
    .slice(0, TIMELINE_MAX_EVENTS)
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );

  // ---------------------------------------------------------------------------
  // Render: Profile
  // ---------------------------------------------------------------------------

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      {/* Header: Name + Status Badge */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            {candidate.name}
          </h1>
          {candidate.currentRole && (
            <p className="text-sm text-muted-foreground">
              {candidate.currentRole}
            </p>
          )}
        </div>
        <StatusBadge
          status={candidate.status}
          size="md"
          className="transition-all duration-300 ease-in-out"
        />
      </div>

      {/* Profile Info Card */}
      <Card>
        <CardHeader>
          <CardTitle>Profile Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2">
            {/* Email */}
            <div className="flex items-center gap-3">
              <MailIcon
                className="h-4 w-4 text-muted-foreground"
                aria-hidden="true"
              />
              <div>
                <p className="text-xs text-muted-foreground">Email</p>
                <a
                  href={`mailto:${candidate.email}`}
                  className="text-sm text-foreground hover:underline"
                >
                  {candidate.email}
                </a>
              </div>
            </div>

            {/* Phone */}
            {candidate.phone && (
              <div className="flex items-center gap-3">
                <PhoneIcon
                  className="h-4 w-4 text-muted-foreground"
                  aria-hidden="true"
                />
                <div>
                  <p className="text-xs text-muted-foreground">Phone</p>
                  <a
                    href={`tel:${candidate.phone}`}
                    className="text-sm text-foreground hover:underline"
                  >
                    {candidate.phone}
                  </a>
                </div>
              </div>
            )}

            {/* Location */}
            {candidate.location && (
              <div className="flex items-center gap-3">
                <MapPinIcon
                  className="h-4 w-4 text-muted-foreground"
                  aria-hidden="true"
                />
                <div>
                  <p className="text-xs text-muted-foreground">Location</p>
                  <p className="text-sm text-foreground">{candidate.location}</p>
                </div>
              </div>
            )}

            {/* Role */}
            {candidate.currentRole && (
              <div className="flex items-center gap-3">
                <BriefcaseIcon
                  className="h-4 w-4 text-muted-foreground"
                  aria-hidden="true"
                />
                <div>
                  <p className="text-xs text-muted-foreground">Current Role</p>
                  <p className="text-sm text-foreground">
                    {candidate.currentRole}
                  </p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Documents Section */}
      <Card>
        <CardHeader>
          <CardTitle>Documents</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {/* Resume */}
            <div className="flex items-center justify-between rounded-md border p-3">
              <div className="flex items-center gap-3">
                <FileTextIcon
                  className="h-5 w-5 text-muted-foreground"
                  aria-hidden="true"
                />
                <div>
                  <p className="text-sm font-medium">Resume</p>
                  <p className="text-xs text-muted-foreground">
                    {resume?.originalFilename ?? 'PDF Document'}
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                disabled={!resume || isDownloading}
                onClick={() => resume && downloadDocument(resume.id)}
                aria-label="Download resume"
              >
                <DownloadIcon className="mr-1 h-3 w-3" />
                Download
              </Button>
            </div>
            {!resume && (
              <p className="flex items-center gap-2 text-xs text-muted-foreground">
                <AlertCircleIcon className="h-3 w-3" />
                Resume not available
              </p>
            )}

            {/* Offer Letter */}
            {offerLetter && (
              <div className="flex items-center justify-between rounded-md border p-3">
                <div className="flex items-center gap-3">
                  <FileTextIcon
                    className="h-5 w-5 text-purple-500"
                    aria-hidden="true"
                  />
                  <div>
                    <p className="text-sm font-medium">Offer Letter</p>
                    <p className="text-xs text-muted-foreground">
                      {offerLetter.originalFilename ?? 'Offer Letter PDF'}
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={isDownloading}
                  onClick={() => downloadDocument(offerLetter.id)}
                  aria-label="Download offer letter"
                >
                  <DownloadIcon className="mr-1 h-3 w-3" />
                  Download
                </Button>
              </div>
            )}

            {/* NDA */}
            {nda && (
              <div className="flex items-center justify-between rounded-md border p-3">
                <div className="flex items-center gap-3">
                  <FileTextIcon
                    className="h-5 w-5 text-amber-500"
                    aria-hidden="true"
                  />
                  <div>
                    <p className="text-sm font-medium">NDA</p>
                    <p className="text-xs text-muted-foreground">
                      {nda.originalFilename ?? 'NDA PDF'}
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={isDownloading}
                  onClick={() => downloadDocument(nda.id)}
                  aria-label="Download NDA"
                >
                  <DownloadIcon className="mr-1 h-3 w-3" />
                  Download
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Offer Generation Form (shown when ?action=generate-offer) */}
      {showOfferForm &&
        candidate.status === CandidateStatus.InterviewScheduled &&
        hasCompletedInterview && (
          <OfferGenerationForm
            candidateId={candidate.id}
            candidateName={candidate.name}
            onSuccess={() => {
              // Remove action param to hide form; the refetch will show updated status
              router.replace(`/candidates/${candidate.id}`);
              refetch();
            }}
            onCancel={() => {
              router.replace(`/candidates/${candidate.id}`);
            }}
          />
        )}

      {/* Action Buttons */}
      {!isTerminal && (
        <Card>
          <CardHeader>
            <CardTitle>Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              {/* Generate Offer: visible when Interview_Scheduled + completed interview */}
              {candidate.status === CandidateStatus.InterviewScheduled &&
                hasCompletedInterview && (
                  <Button
                    onClick={handleGenerateOffer}
                    disabled={isTransitioning}
                  >
                    <SendIcon className="mr-2 h-4 w-4" />
                    Generate Offer Documents
                  </Button>
                )}

              {/* Mark as Hired: visible when Offer_Sent */}
              {candidate.status === CandidateStatus.OfferSent && (
                <Button
                  onClick={handleMarkAsHired}
                  disabled={isTransitioning}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  <CheckCircleIcon className="mr-2 h-4 w-4" />
                  Mark as Hired
                </Button>
              )}

              {/* Reject: visible for any non-terminal status */}
              <Button
                variant="destructive"
                onClick={handleReject}
                disabled={isTransitioning}
              >
                <XCircleIcon className="mr-2 h-4 w-4" />
                Reject
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Timeline Section */}
      <Card>
        <CardHeader>
          <CardTitle>Activity Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          {timelineEvents.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No activity recorded yet.
            </p>
          ) : (
            <div
              className="relative space-y-0"
              role="list"
              aria-label="Candidate activity timeline"
            >
              {timelineEvents.map((event, index) => (
                <div
                  key={event.id}
                  className="relative flex gap-4 pb-6 last:pb-0"
                  role="listitem"
                >
                  {/* Vertical line connector */}
                  {index < timelineEvents.length - 1 && (
                    <div
                      className="absolute left-4 top-8 h-full w-px bg-border"
                      aria-hidden="true"
                    />
                  )}

                  {/* Icon */}
                  <div
                    className={cn(
                      'relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
                      getTimelineIconColor(event.eventType as TimelineEventType),
                    )}
                    aria-hidden="true"
                  >
                    {getTimelineIcon(event.eventType as TimelineEventType)}
                  </div>

                  {/* Content */}
                  <div className="flex-1 pt-0.5">
                    <p className="text-sm font-medium text-foreground">
                      {getTimelineLabel(event)}
                    </p>
                    {event.details && (
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {event.details}
                      </p>
                    )}
                    <p className="mt-1 text-xs text-muted-foreground">
                      <time dateTime={event.createdAt}>
                        {formatRelativeTime(event.createdAt)}
                      </time>
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Rejection Dialog */}
      <RejectionDialog
        open={rejectionDialogOpen}
        onOpenChange={setRejectionDialogOpen}
        reason={rejectionReason}
        onReasonChange={(val) => {
          setRejectionReason(val);
          // Clear error on input change
          if (rejectionReasonError) setRejectionReasonError('');
        }}
        reasonError={rejectionReasonError}
        onConfirm={handleConfirmReject}
        loading={isTransitioning}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Rejection Dialog Component (uses Dialog primitives for textarea support)
// ---------------------------------------------------------------------------

interface RejectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reason: string;
  onReasonChange: (val: string) => void;
  reasonError: string;
  onConfirm: () => void;
  loading: boolean;
}

function RejectionDialog({
  open,
  onOpenChange,
  reason,
  onReasonChange,
  reasonError,
  onConfirm,
  loading,
}: RejectionDialogProps) {
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  // Focus the textarea when dialog opens
  React.useEffect(() => {
    if (open && textareaRef.current) {
      setTimeout(() => textareaRef.current?.focus(), 100);
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false} aria-labelledby="reject-dialog-title">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-destructive/10"
              aria-hidden="true"
            >
              <AlertCircleIcon className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <DialogTitle id="reject-dialog-title">
                Reject Candidate
              </DialogTitle>
              <DialogDescription>
                This action cannot be undone. Please provide a reason for the
                rejection ({REJECTION_REASON_MIN}-{REJECTION_REASON_MAX}{' '}
                characters).
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Rejection Reason Textarea */}
        <div className="space-y-2">
          <label
            htmlFor="rejection-reason"
            className="text-sm font-medium text-foreground"
          >
            Reason for rejection
          </label>
          <textarea
            ref={textareaRef}
            id="rejection-reason"
            className={cn(
              'flex min-h-[100px] w-full rounded-md border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
              reasonError && 'border-destructive focus-visible:ring-destructive',
            )}
            placeholder="Explain why this candidate is being rejected..."
            value={reason}
            onChange={(e) => onReasonChange(e.target.value)}
            maxLength={REJECTION_REASON_MAX}
            aria-invalid={!!reasonError}
            aria-describedby={
              reasonError ? 'rejection-reason-error' : 'rejection-reason-hint'
            }
          />
          {reasonError ? (
            <p
              id="rejection-reason-error"
              className="text-xs text-destructive"
              role="alert"
            >
              {reasonError}
            </p>
          ) : (
            <p
              id="rejection-reason-hint"
              className="text-xs text-muted-foreground"
            >
              {reason.trim().length}/{REJECTION_REASON_MAX} characters
            </p>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={onConfirm}
            disabled={loading || reason.trim().length < REJECTION_REASON_MIN}
            aria-busy={loading}
          >
            {loading ? 'Rejecting...' : 'Reject Candidate'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Utility: Relative Time Formatter
// ---------------------------------------------------------------------------

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSeconds < 60) return 'Just now';
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  });
}
