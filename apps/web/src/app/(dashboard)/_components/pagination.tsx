/**
 * Pagination — Page navigation for the candidate pipeline list.
 *
 * Keyboard accessible with proper ARIA labels and 44px min touch targets.
 * Announces page changes via aria-live for screen reader users.
 *
 * Validates: Requirements 2.1, 15.1, 15.2, 16.1
 */

'use client';

import * as React from 'react';
import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  total: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function Pagination({
  currentPage,
  totalPages,
  total,
  pageSize,
  onPageChange,
}: PaginationProps) {
  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, total);

  // Generate page numbers to display
  const pageNumbers = React.useMemo(() => {
    const pages: (number | 'ellipsis')[] = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Always show first page
      pages.push(1);

      if (currentPage > 3) {
        pages.push('ellipsis');
      }

      // Pages around current
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);
      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      if (currentPage < totalPages - 2) {
        pages.push('ellipsis');
      }

      // Always show last page
      pages.push(totalPages);
    }

    return pages;
  }, [currentPage, totalPages]);

  return (
    <nav
      className="flex flex-col items-center justify-between gap-4 sm:flex-row"
      role="navigation"
      aria-label="Pagination"
    >
      {/* Results summary — announced on page change */}
      <p className="text-sm text-muted-foreground" aria-live="polite" aria-atomic="true">
        Showing <span className="font-medium">{startItem}</span> to{' '}
        <span className="font-medium">{endItem}</span> of{' '}
        <span className="font-medium">{total}</span> candidates
      </p>

      {/* Page controls — min 44x44 touch targets */}
      <div className="flex items-center gap-1" role="group" aria-label="Page navigation">
        {/* Previous */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          aria-label="Go to previous page"
          className="h-11 w-11 p-0"
        >
          <ChevronLeftIcon className="h-4 w-4" aria-hidden="true" />
        </Button>

        {/* Page numbers */}
        {pageNumbers.map((page, index) =>
          page === 'ellipsis' ? (
            <span
              key={`ellipsis-${index}`}
              className="flex h-11 w-8 items-center justify-center text-sm text-muted-foreground"
              aria-hidden="true"
            >
              …
            </span>
          ) : (
            <Button
              key={page}
              variant={page === currentPage ? 'default' : 'outline'}
              size="sm"
              onClick={() => onPageChange(page)}
              aria-label={`Page ${page}${page === currentPage ? ', current page' : ''}`}
              aria-current={page === currentPage ? 'page' : undefined}
              className={cn(
                'h-11 w-11 p-0',
                page === currentPage && 'pointer-events-none',
              )}
            >
              {page}
            </Button>
          ),
        )}

        {/* Next */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
          aria-label="Go to next page"
          className="h-11 w-11 p-0"
        >
          <ChevronRightIcon className="h-4 w-4" aria-hidden="true" />
        </Button>
      </div>
    </nav>
  );
}
