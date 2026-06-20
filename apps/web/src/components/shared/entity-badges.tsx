'use client';

import {
  DocumentType,
  InterviewStatus,
  InterviewType,
  JobOpeningStatus,
  Recommendation,
} from '@rove-hire/shared';

import { TokenBadge, type TokenBadgeProps } from '@/components/shared/token-badge';

type BadgeSize = TokenBadgeProps['size'];

/** Job opening Open / Closed */
export function JobStatusBadge({
  status,
  size = 'sm',
}: {
  status: JobOpeningStatus;
  size?: BadgeSize;
}) {
  const isOpen = status === JobOpeningStatus.Open;
  return (
    <TokenBadge
      size={size}
      label={isOpen ? 'Open' : 'Closed'}
      ariaLabel={`Job status: ${isOpen ? 'Open' : 'Closed'}`}
      textVar={isOpen ? '--color-status-hired' : '--color-badge-neutral'}
      bgVar={isOpen ? '--color-status-hired-bg' : '--color-badge-neutral-bg'}
    />
  );
}

/** Interview lifecycle status */
export function InterviewStatusBadge({
  status,
  size = 'sm',
}: {
  status: InterviewStatus;
  size?: BadgeSize;
}) {
  const config: Record<InterviewStatus, { textVar: string; bgVar: string; label: string }> = {
    [InterviewStatus.Scheduled]: {
      textVar: '--color-status-applied',
      bgVar: '--color-status-applied-bg',
      label: 'Scheduled',
    },
    [InterviewStatus.Completed]: {
      textVar: '--color-status-hired',
      bgVar: '--color-status-hired-bg',
      label: 'Completed',
    },
    [InterviewStatus.Cancelled]: {
      textVar: '--color-badge-neutral',
      bgVar: '--color-badge-neutral-bg',
      label: 'Cancelled',
    },
  };

  const { textVar, bgVar, label } = config[status];
  return (
    <TokenBadge
      size={size}
      label={label}
      ariaLabel={`Interview status: ${label}`}
      textVar={textVar}
      bgVar={bgVar}
    />
  );
}

/** Interview type (Screening / Technical) */
export function InterviewTypeBadge({
  type,
  size = 'sm',
}: {
  type: InterviewType;
  size?: BadgeSize;
}) {
  const config: Record<InterviewType, { textVar: string; bgVar: string; label: string }> = {
    [InterviewType.Screening]: {
      textVar: '--color-status-interview-scheduled',
      bgVar: '--color-status-interview-scheduled-bg',
      label: 'Screening',
    },
    [InterviewType.Technical]: {
      textVar: '--color-status-form-submitted',
      bgVar: '--color-status-form-submitted-bg',
      label: 'Technical',
    },
  };

  const { textVar, bgVar, label } = config[type];
  return (
    <TokenBadge
      size={size}
      label={label}
      ariaLabel={`Interview type: ${label}`}
      textVar={textVar}
      bgVar={bgVar}
    />
  );
}

/** Feedback recommendation */
export function RecommendationBadge({
  recommendation,
  size = 'sm',
}: {
  recommendation: Recommendation;
  size?: BadgeSize;
}) {
  const config: Record<Recommendation, { textVar: string; bgVar: string; label: string }> = {
    [Recommendation.Hire]: {
      textVar: '--color-status-hired',
      bgVar: '--color-status-hired-bg',
      label: 'Hire',
    },
    [Recommendation.NoHire]: {
      textVar: '--color-status-rejected',
      bgVar: '--color-status-rejected-bg',
      label: 'No Hire',
    },
    [Recommendation.Maybe]: {
      textVar: '--color-status-form-submitted',
      bgVar: '--color-status-form-submitted-bg',
      label: 'Maybe',
    },
  };

  const { textVar, bgVar, label } = config[recommendation];
  return (
    <TokenBadge
      size={size}
      label={label}
      ariaLabel={`Recommendation: ${label}`}
      textVar={textVar}
      bgVar={bgVar}
    />
  );
}

/** Generated document type */
export function DocumentTypeBadge({ type, size = 'sm' }: { type: DocumentType; size?: BadgeSize }) {
  const config: Record<DocumentType, { textVar: string; bgVar: string; label: string }> = {
    [DocumentType.Resume]: {
      textVar: '--color-status-applied',
      bgVar: '--color-status-applied-bg',
      label: 'Resume',
    },
    [DocumentType.OfferLetter]: {
      textVar: '--color-status-offer-sent',
      bgVar: '--color-status-offer-sent-bg',
      label: 'Offer Letter',
    },
    [DocumentType.Nda]: {
      textVar: '--color-status-interview-scheduled',
      bgVar: '--color-status-interview-scheduled-bg',
      label: 'NDA',
    },
  };

  const { textVar, bgVar, label } = config[type];
  return (
    <TokenBadge
      size={size}
      label={label}
      ariaLabel={`Document type: ${label}`}
      textVar={textVar}
      bgVar={bgVar}
    />
  );
}
