'use client';

import * as React from 'react';
import { usePathname } from 'next/navigation';

/**
 * RouteChangeAnnouncer
 *
 * Announces route changes to screen readers using an ARIA live region.
 * Moves focus to the main content area within 100ms of navigation
 * to ensure keyboard users start at the new page content.
 *
 * Requirements: 15.1, 15.8
 */
export function RouteChangeAnnouncer() {
  const pathname = usePathname();
  const [announcement, setAnnouncement] = React.useState('');
  const isFirstRender = React.useRef(true);

  React.useEffect(() => {
    // Skip the first render (initial page load)
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    // Derive a human-readable page name from the pathname
    const pageName = getPageName(pathname);
    setAnnouncement(`Navigated to ${pageName}`);

    // Move focus to main content within 100ms
    const timer = setTimeout(() => {
      const mainContent = document.getElementById('main-content');
      if (mainContent) {
        mainContent.focus({ preventScroll: false });
      }
    }, 50);

    return () => clearTimeout(timer);
  }, [pathname]);

  return (
    <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
      {announcement}
    </div>
  );
}

/**
 * Derives a human-readable page name from a Next.js pathname.
 */
function getPageName(pathname: string): string {
  if (pathname === '/') return 'Dashboard';

  const segments = pathname.split('/').filter(Boolean);
  const lastSegment = segments[segments.length - 1];

  // Handle dynamic segments (UUIDs) — use the parent segment
  if (lastSegment && /^[0-9a-f-]{36}$/i.test(lastSegment)) {
    const parentSegment = segments[segments.length - 2];
    return parentSegment ? `${formatSegment(parentSegment)} detail` : 'Detail page';
  }

  return formatSegment(lastSegment || 'page');
}

function formatSegment(segment: string): string {
  return segment.replace(/-/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
}
