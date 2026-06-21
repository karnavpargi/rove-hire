'use client';

import * as React from 'react';
import { CandidateStatus } from '@rove-hire/shared';

import { TokenBadge, type TokenBadgeProps } from '@/components/shared/token-badge';

/**
 * Status color configuration using design-system CSS custom properties
 * defined in globals.css (--color-status-*).
 */
const STATUS_STYLES: Record<CandidateStatus, { bgVar: string; textVar: string; label: string }> = {
  [CandidateStatus.Applied]: {
    bgVar: '--color-status-applied-bg',
    textVar: '--color-status-applied',
    label: 'Applied',
  },
  [CandidateStatus.FormSubmitted]: {
    bgVar: '--color-status-form-submitted-bg',
    textVar: '--color-status-form-submitted',
    label: 'Form Submitted',
  },
  [CandidateStatus.InterviewScheduled]: {
    bgVar: '--color-status-interview-scheduled-bg',
    textVar: '--color-status-interview-scheduled',
    label: 'Interview Scheduled',
  },
  [CandidateStatus.OfferSent]: {
    bgVar: '--color-status-offer-sent-bg',
    textVar: '--color-status-offer-sent',
    label: 'Offer Sent',
  },
  [CandidateStatus.Hired]: {
    bgVar: '--color-status-hired-bg',
    textVar: '--color-status-hired',
    label: 'Hired',
  },
  [CandidateStatus.Rejected]: {
    bgVar: '--color-status-rejected-bg',
    textVar: '--color-status-rejected',
    label: 'Rejected',
  },
};

export interface StatusBadgeProps extends Omit<TokenBadgeProps, 'textVar' | 'bgVar' | 'label'> {
  /** The candidate pipeline status to display */
  status: CandidateStatus;
}

/**
 * StatusBadge displays a color-coded badge for each CandidateStatus.
 * Colors are sourced from globals.css design tokens.
 */
export function StatusBadge({ status, size = 'md', ...props }: StatusBadgeProps) {
  const config = STATUS_STYLES[status];

  return (
    <TokenBadge
      size={size}
      label={config.label}
      ariaLabel={`Status: ${config.label}`}
      textVar={config.textVar}
      bgVar={config.bgVar}
      {...props}
    />
  );
}
