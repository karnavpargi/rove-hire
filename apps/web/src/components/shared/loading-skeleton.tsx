import * as React from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

export interface LoadingSkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Layout variant to match different page content */
  variant?: 'list' | 'profile' | 'card';
  /** Number of rows to render (for list variant) */
  rows?: number;
}

/**
 * LoadingSkeleton provides animated content placeholders that match
 * the visual structure of list items and profile layouts.
 */
export function LoadingSkeleton({
  variant = 'list',
  rows = 5,
  className,
  ...props
}: LoadingSkeletonProps) {
  if (variant === 'profile') {
    return (
      <div
        className={cn('space-y-6', className)}
        role="status"
        aria-label="Loading content"
        aria-busy="true"
        {...props}
      >
        {/* Profile header */}
        <div className="flex items-start gap-4">
          <Skeleton className="h-16 w-16 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-24" />
          </div>
        </div>
        {/* Profile details */}
        <div className="space-y-3">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
        {/* Timeline section */}
        <div className="space-y-4">
          <Skeleton className="h-5 w-24" />
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex gap-3">
              <Skeleton className="h-8 w-8 rounded-full" />
              <div className="flex-1 space-y-1">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/3" />
              </div>
            </div>
          ))}
        </div>
        <span className="sr-only">Loading profile...</span>
      </div>
    );
  }

  if (variant === 'card') {
    return (
      <div
        className={cn('space-y-4', className)}
        role="status"
        aria-label="Loading content"
        aria-busy="true"
        {...props}
      >
        <Skeleton className="h-40 w-full rounded-lg" />
        <div className="space-y-2">
          <Skeleton className="h-5 w-2/3" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>
        <span className="sr-only">Loading content...</span>
      </div>
    );
  }

  // Default: list variant
  return (
    <div
      className={cn('space-y-3', className)}
      role="status"
      aria-label="Loading list"
      aria-busy="true"
      {...props}
    >
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 rounded-md border p-4">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-3 w-1/4" />
          </div>
          <Skeleton className="h-6 w-20 rounded-full" />
          <Skeleton className="h-3 w-16" />
        </div>
      ))}
      <span className="sr-only">Loading list...</span>
    </div>
  );
}
