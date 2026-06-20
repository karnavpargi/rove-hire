'use client';

import * as React from 'react';

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
  '[contenteditable]',
].join(', ');

interface FocusTrapProps {
  /** Whether the focus trap is active */
  active: boolean;
  /** Content to trap focus within */
  children: React.ReactNode;
  /** Callback when Escape is pressed */
  onEscape?: () => void;
  /** Whether to auto-focus the first element on activation */
  autoFocus?: boolean;
  /** Element to return focus to on deactivation */
  returnFocusTo?: HTMLElement | null;
}

/**
 * FocusTrap — Traps keyboard focus within a container.
 *
 * Used for modal dialogs to prevent Tab from escaping the modal,
 * ensuring no keyboard traps in the rest of the page.
 * Focus moves to the first focusable element within 100ms of activation.
 *
 * Requirements: 15.2, 15.8
 */
export function FocusTrap({
  active,
  children,
  onEscape,
  autoFocus = true,
  returnFocusTo,
}: FocusTrapProps) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const previousFocusRef = React.useRef<HTMLElement | null>(null);

  // Store the previously focused element on activation
  React.useEffect(() => {
    if (active) {
      previousFocusRef.current =
        returnFocusTo || (document.activeElement as HTMLElement);

      // Auto-focus first focusable element within 100ms
      if (autoFocus) {
        const timer = setTimeout(() => {
          const container = containerRef.current;
          if (!container) return;
          const firstFocusable = container.querySelector<HTMLElement>(
            FOCUSABLE_SELECTOR,
          );
          if (firstFocusable) {
            firstFocusable.focus();
          }
        }, 50);
        return () => clearTimeout(timer);
      }
    } else {
      // Return focus on deactivation
      if (previousFocusRef.current) {
        previousFocusRef.current.focus();
        previousFocusRef.current = null;
      }
    }
  }, [active, autoFocus, returnFocusTo]);

  // Handle keyboard events for trap
  const handleKeyDown = React.useCallback(
    (e: React.KeyboardEvent) => {
      if (!active) return;

      if (e.key === 'Escape' && onEscape) {
        e.preventDefault();
        onEscape();
        return;
      }

      if (e.key === 'Tab') {
        const container = containerRef.current;
        if (!container) return;

        const focusable = Array.from(
          container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
        );

        if (focusable.length === 0) {
          e.preventDefault();
          return;
        }

        const firstFocusable = focusable[0];
        const lastFocusable = focusable[focusable.length - 1];

        if (e.shiftKey) {
          // Shift+Tab: wrap to last if at first
          if (document.activeElement === firstFocusable) {
            e.preventDefault();
            lastFocusable.focus();
          }
        } else {
          // Tab: wrap to first if at last
          if (document.activeElement === lastFocusable) {
            e.preventDefault();
            firstFocusable.focus();
          }
        }
      }
    },
    [active, onEscape],
  );

  return (
    <div
      ref={containerRef}
      onKeyDown={handleKeyDown}
      role="presentation"
    >
      {children}
    </div>
  );
}
