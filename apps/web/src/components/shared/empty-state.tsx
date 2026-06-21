import * as React from 'react';
import { InboxIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

export interface EmptyStateProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Icon component to display as illustration */
  icon?: React.ReactNode;
  /** Main heading text */
  title?: string;
  /** Descriptive text explaining the empty state */
  description: string;
  /** CTA link href */
  actionHref?: string;
  /** CTA button label */
  actionLabel?: string;
  /** Optional click handler for the CTA (alternative to href) */
  onAction?: () => void;
}

/**
 * EmptyState displays a friendly message when no content is available,
 * with an illustration, description, and optional call-to-action link.
 */
export function EmptyState({
  icon,
  title,
  description,
  actionHref,
  actionLabel,
  onAction,
  className,
  ...props
}: EmptyStateProps) {
  return (
    <div
      className={cn('flex flex-col items-center justify-center py-12 px-6 text-center', className)}
      role="status"
      aria-label={title || 'No content available'}
      {...props}
    >
      {/* Illustration / Icon */}
      <div className="mb-4 rounded-full bg-muted p-4" aria-hidden="true">
        {icon || <InboxIcon className="h-10 w-10 text-muted-foreground" />}
      </div>

      {/* Title */}
      {title && <h3 className="mb-1 text-lg font-semibold text-foreground">{title}</h3>}

      {/* Description */}
      <p className="mb-6 max-w-sm text-sm text-muted-foreground">{description}</p>

      {/* CTA */}
      {(actionHref || onAction) &&
        actionLabel &&
        (actionHref ? (
          <Button asChild>
            <a href={actionHref}>{actionLabel}</a>
          </Button>
        ) : (
          <Button onClick={onAction}>{actionLabel}</Button>
        ))}
    </div>
  );
}
