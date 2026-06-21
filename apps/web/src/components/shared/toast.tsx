'use client';

import * as React from 'react';
import { toast as sonnerToast } from 'sonner';
import { announceToScreenReader } from '@/components/accessibility/live-region';

/** Maximum number of visible toasts at once */
const MAX_TOASTS = 3;

/** Auto-dismiss duration in milliseconds */
const AUTO_DISMISS_MS = 5000;

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface ToastOptions {
  /** Toast message content */
  message: string;
  /** Optional description text */
  description?: string;
  /** Toast type for styling */
  type?: ToastType;
  /** Duration in ms before auto-dismiss (default: 5000) */
  duration?: number;
}

/** Internal tracker for active toast IDs (oldest first) */
let activeToastIds: (string | number)[] = [];

/**
 * Dismisses the oldest toast when the max limit is exceeded.
 * Ensures max 3 toasts are visible at any time.
 */
function enforceMaxToasts() {
  while (activeToastIds.length >= MAX_TOASTS) {
    const oldest = activeToastIds.shift();
    if (oldest !== undefined) {
      sonnerToast.dismiss(oldest);
    }
  }
}

/**
 * Show a toast notification with auto-dismiss (5s) and max 3 stacking.
 * Oldest toast is dismissed first when the limit is reached.
 *
 * Announces toast content to screen readers via ARIA live regions.
 * - Errors use 'assertive' politeness (Requirements: 15.6)
 * - Status/success/info use 'polite' politeness (Requirements: 15.6)
 */
export function showToast({
  message,
  description,
  type = 'info',
  duration = AUTO_DISMISS_MS,
}: ToastOptions) {
  enforceMaxToasts();

  // Announce to screen readers via ARIA live region
  const fullMessage = description ? `${message}. ${description}` : message;
  const politeness = type === 'error' ? 'assertive' : 'polite';
  announceToScreenReader(fullMessage, politeness);

  const toastFn =
    type === 'success'
      ? sonnerToast.success
      : type === 'error'
        ? sonnerToast.error
        : type === 'warning'
          ? sonnerToast.warning
          : sonnerToast.info;

  const id = toastFn(message, {
    description,
    duration,
    onDismiss: (t) => {
      activeToastIds = activeToastIds.filter((tid) => tid !== t.id);
    },
    onAutoClose: (t) => {
      activeToastIds = activeToastIds.filter((tid) => tid !== t.id);
    },
  });

  activeToastIds.push(id);
  return id;
}

/**
 * React hook providing toast notification functions.
 * Wraps showToast in a stable API for component usage.
 */
export function useToast() {
  const toast = React.useCallback((options: ToastOptions) => showToast(options), []);

  const success = React.useCallback(
    (message: string, description?: string) => showToast({ message, description, type: 'success' }),
    [],
  );

  const error = React.useCallback(
    (message: string, description?: string) => showToast({ message, description, type: 'error' }),
    [],
  );

  const warning = React.useCallback(
    (message: string, description?: string) => showToast({ message, description, type: 'warning' }),
    [],
  );

  const info = React.useCallback(
    (message: string, description?: string) => showToast({ message, description, type: 'info' }),
    [],
  );

  return { toast, success, error, warning, info };
}
