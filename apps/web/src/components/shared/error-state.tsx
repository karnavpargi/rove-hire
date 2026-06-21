import * as React from 'react';
import { AlertCircleIcon, RefreshCwIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

export interface ErrorStateProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Error message to display */
  message?: string;
  /** Detailed error description */
  description?: string;
  /** Callback invoked when the retry button is clicked */
  onRetry?: () => void;
  /** Label for the retry button */
  retryLabel?: string;
}

/**
 * ErrorState displays an error message with an optional retry button.
 * Used when data fetching or operations fail.
 */
export function ErrorState({
  message = 'Something went wrong',
  description,
  onRetry,
  retryLabel = 'Try again',
  className,
  ...props
}: ErrorStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center py-12 px-6 text-center',
        className,
      )}
      role="alert"
      aria-live="assertive"
      {...props}
    >
      {/* Error icon */}
      <div className="mb-4 rounded-full bg-destructive/10 p-4" aria-hidden="true">
        <AlertCircleIcon className="h-10 w-10 text-destructive" />
      </div>

      {/* Error message */}
      <h3 className="mb-1 text-lg font-semibold text-foreground">{message}</h3>

      {/* Description */}
      {description && (
        <p className="mb-6 max-w-sm text-sm text-muted-foreground">{description}</p>
      )}

      {/* Retry button */}
      {onRetry && (
        <Button onClick={onRetry} variant="outline" className="mt-4">
          <RefreshCwIcon className="mr-2 h-4 w-4" />
          {retryLabel}
        </Button>
      )}
    </div>
  );
}
