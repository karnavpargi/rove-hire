'use client';

/**
 * Skip Navigation Link
 * First focusable element in the DOM for keyboard accessibility.
 * Visually hidden until focused, allowing keyboard users to bypass
 * repetitive navigation content.
 *
 * Requirements: 15.10
 */
export function SkipNav() {
  return (
    <a
      href="#main-content"
      className="fixed top-0 left-0 z-[100] -translate-y-full rounded-br-md bg-primary-600 px-4 py-2 text-sm font-medium text-white transition-transform focus:translate-y-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
    >
      Skip to main content
    </a>
  );
}
