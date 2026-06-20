'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

export interface TokenBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** CSS custom property for foreground/text color (e.g. `--color-status-applied`) */
  textVar: string;
  /** CSS custom property for background tint (e.g. `--color-status-applied-bg`) */
  bgVar: string;
  /** Visible label */
  label: string;
  /** Optional aria label; defaults to `label` */
  ariaLabel?: string;
  size?: 'sm' | 'md' | 'lg';
}

/**
 * TokenBadge renders a pill badge using design-system CSS custom properties.
 * Shared by pipeline status and entity-specific badges (jobs, interviews, documents).
 */
export function TokenBadge({
  textVar,
  bgVar,
  label,
  ariaLabel,
  size = 'md',
  className,
  style,
  ...props
}: TokenBadgeProps) {
  return (
    <span
      role="status"
      aria-label={ariaLabel ?? label}
      className={cn(
        'inline-flex items-center rounded-full font-medium transition-colors duration-200',
        size === 'sm' && 'px-2 py-0.5 text-xs',
        size === 'md' && 'px-2.5 py-1 text-xs',
        size === 'lg' && 'px-3 py-1.5 text-sm',
        className,
      )}
      style={{
        backgroundColor: `var(${bgVar})`,
        color: `var(${textVar})`,
        ...style,
      }}
      {...props}
    >
      {label}
    </span>
  );
}
