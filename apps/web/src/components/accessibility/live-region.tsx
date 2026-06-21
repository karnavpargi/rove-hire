'use client';

import * as React from 'react';

type LiveRegionPoliteness = 'polite' | 'assertive';

interface LiveRegionProps {
  /** The message to announce */
  message: string;
  /** Politeness level: 'assertive' for errors, 'polite' for status updates */
  politeness?: LiveRegionPoliteness;
  /** Optional className for positioning */
  className?: string;
}

/**
 * LiveRegion — Announces dynamic changes to assistive technology.
 *
 * Use 'assertive' for errors and critical updates that need immediate attention.
 * Use 'polite' for status updates, success messages, and non-urgent notifications.
 *
 * Requirements: 15.6
 */
export function LiveRegion({ message, politeness = 'polite', className }: LiveRegionProps) {
  return (
    <div
      role={politeness === 'assertive' ? 'alert' : 'status'}
      aria-live={politeness}
      aria-atomic="true"
      className={className || 'sr-only'}
    >
      {message}
    </div>
  );
}

/**
 * Hook to manage live region announcements programmatically.
 * Returns a function to trigger announcements.
 *
 * Usage:
 * const announce = useAnnounce();
 * announce('Form submitted successfully', 'polite');
 * announce('Please fix the errors below', 'assertive');
 */
export function useAnnounce() {
  const [announcement, setAnnouncement] = React.useState<{
    message: string;
    politeness: LiveRegionPoliteness;
    key: number;
  } | null>(null);

  const announce = React.useCallback(
    (message: string, politeness: LiveRegionPoliteness = 'polite') => {
      // Use a key to force re-render even with same message
      setAnnouncement({ message, politeness, key: Date.now() });
    },
    [],
  );

  const AnnouncerRegion = React.useCallback(() => {
    if (!announcement) return null;
    return (
      <LiveRegion
        key={announcement.key}
        message={announcement.message}
        politeness={announcement.politeness}
      />
    );
  }, [announcement]);

  return { announce, AnnouncerRegion };
}

/**
 * Global live region provider — renders both polite and assertive regions.
 * Place once in the root layout to support announcements from anywhere.
 *
 * Requirements: 15.6
 */
export function GlobalLiveRegions() {
  return (
    <>
      {/* Polite region for status updates (toast confirmations, loading states) */}
      <div
        id="live-region-polite"
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      />
      {/* Assertive region for errors (form validation, critical failures) */}
      <div
        id="live-region-assertive"
        role="alert"
        aria-live="assertive"
        aria-atomic="true"
        className="sr-only"
      />
    </>
  );
}

/**
 * Utility to announce a message via the global live regions.
 * Call from anywhere (hooks, event handlers) without needing a component.
 * Safe to call during SSR (no-ops when document is unavailable).
 */
export function announceToScreenReader(
  message: string,
  politeness: LiveRegionPoliteness = 'polite',
) {
  if (typeof document === 'undefined') return;

  const regionId = politeness === 'assertive' ? 'live-region-assertive' : 'live-region-polite';
  const region = document.getElementById(regionId);
  if (region) {
    // Clear then set to ensure re-announcement of same message
    region.textContent = '';
    requestAnimationFrame(() => {
      region.textContent = message;
    });
  }
}
