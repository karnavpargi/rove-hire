'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { ChevronRight, Home } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Human-readable labels for route segments.
 * Maps URL slugs to display names.
 */
const segmentLabels: Record<string, string> = {
  jobs: 'Jobs',
  candidates: 'Candidates',
  interviews: 'Interviews',
  documents: 'Documents',
  settings: 'Settings',
  new: 'New',
};

/**
 * Breadcrumb Navigation Component
 *
 * Displays hierarchical navigation path on detail pages.
 * Format: Dashboard > Section > Item
 * Only renders when path has more than one segment (detail pages).
 *
 * Requirements: 18.3
 */
export function Breadcrumbs() {
  const pathname = usePathname();

  // Split pathname into segments, filtering empty strings
  const segments = pathname.split('/').filter(Boolean);

  // Don't show breadcrumbs on the root dashboard page
  if (segments.length === 0) {
    return null;
  }

  // Build breadcrumb items with accumulated paths
  const breadcrumbItems = segments.map((segment, index) => {
    const href = '/' + segments.slice(0, index + 1).join('/');
    const label = segmentLabels[segment] || formatSegment(segment);
    const isLast = index === segments.length - 1;

    return { href, label, isLast };
  });

  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-sm">
      {/* Dashboard root link */}
      <Link
        href="/"
        className="flex items-center gap-1 text-[hsl(var(--muted-foreground))] transition-colors hover:text-[hsl(var(--foreground))]"
      >
        <Home className="h-3.5 w-3.5" aria-hidden="true" />
        <span>Dashboard</span>
      </Link>

      {/* Separator and segments */}
      {breadcrumbItems.map((item) => (
        <span key={item.href} className="flex items-center gap-1">
          <ChevronRight
            className="h-3.5 w-3.5 text-[hsl(var(--muted-foreground))]"
            aria-hidden="true"
          />
          {item.isLast ? (
            <span
              className="font-medium text-[hsl(var(--foreground))]"
              aria-current="page"
            >
              {item.label}
            </span>
          ) : (
            <Link
              href={item.href}
              className="text-[hsl(var(--muted-foreground))] transition-colors hover:text-[hsl(var(--foreground))]"
            >
              {item.label}
            </Link>
          )}
        </span>
      ))}
    </nav>
  );
}

/**
 * Formats a URL segment into a human-readable label.
 * Handles UUIDs (truncates) and hyphenated words (capitalizes).
 */
function formatSegment(segment: string): string {
  // If it looks like a UUID, truncate it for display
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-/.test(segment)) {
    return segment.slice(0, 8) + '…';
  }

  // Convert hyphenated/underscored words to title case
  return segment
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}
