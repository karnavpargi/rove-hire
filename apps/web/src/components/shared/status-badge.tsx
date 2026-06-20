'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { CandidateStatus } from '@rove-hire/shared';

/**
 * Status color configuration ensuring WCAG AA 4.5:1 contrast ratio.
 * Each status maps to a background + text color combination verified against
 * white/dark backgrounds for accessibility.
 */
const STATUS_STYLES: Record<CandidateStatus, { bg: string; text: string; label: string }> = {
  [CandidateStatus.Applied]: {
    bg: 'bg-blue-100 dark:bg-blue-900/40',
    text: 'text-blue-800 dark:text-blue-200',
    label: 'Applied',
  },
  [CandidateStatus.FormSubmitted]: {
    bg: 'bg-indigo-100 dark:bg-indigo-900/40',
    text: 'text-indigo-800 dark:text-indigo-200',
    label: 'Form Submitted',
  },
  [CandidateStatus.InterviewScheduled]: {
    bg: 'bg-amber-100 dark:bg-amber-900/40',
    text: 'text-amber-800 dark:text-amber-200',
    label: 'Interview Scheduled',
  },
  [CandidateStatus.OfferSent]: {
    bg: 'bg-purple-100 dark:bg-purple-900/40',
    text: 'text-purple-800 dark:text-purple-200',
    label: 'Offer Sent',
  },
  [CandidateStatus.Hired]: {
    bg: 'bg-green-100 dark:bg-green-900/40',
    text: 'text-green-800 dark:text-green-200',
    label: 'Hired',
  },
  [CandidateStatus.Rejected]: {
    bg: 'bg-red-100 dark:bg-red-900/40',
    text: 'text-red-800 dark:text-red-200',
    label: 'Rejected',
  },
};

export interface StatusBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** The candidate pipeline status to display */
  status: CandidateStatus;
  /** Optional size variant */
  size?: 'sm' | 'md';
}

/**
 * StatusBadge displays a color-coded badge for each CandidateStatus.
 * Colors are chosen to meet WCAG AA 4.5:1 contrast requirements.
 */
export function StatusBadge({ status, size = 'md', className, ...props }: StatusBadgeProps) {
  const style = STATUS_STYLES[status];

  return (
    <span
      role="status"
      aria-label={`Status: ${style.label}`}
      className={cn(
        'inline-flex items-center rounded-full font-medium transition-colors duration-200',
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs',
        style.bg,
        style.text,
        className,
      )}
      {...props}
    >
      {style.label}
    </span>
  );
}
