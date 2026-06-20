/**
 * Dashboard Page — Candidate Pipeline
 *
 * Displays a paginated, searchable, filterable list of candidates
 * sorted by last activity date descending. Supports optimistic status
 * transitions with immediate UI feedback.
 *
 * Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 12.5, 12.6
 */

'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';
import { UsersIcon } from 'lucide-react';
import { CandidateStatus, type Candidate } from '@rove-hire/shared';

import { SearchInput } from '@/components/shared/search-input';
import { StatusBadge } from '@/components/shared/status-badge';
import { LoadingSkeleton } from '@/components/shared/loading-skeleton';
import { EmptyState } from '@/components/shared/empty-state';
import { ErrorState } from '@/components/shared/error-state';
import { resolveDisplayStatus } from '@/lib/optimistic-updates';
import { useCandidates } from '@/hooks/use-candidates';
import { StatusFilter } from './_components/status-filter';
import { Pagination } from './_components/pagination';

export default function DashboardPage() {
  const router = useRouter();

  // ---------------------------------------------------------------------------
  // State
  // ---------------------------------------------------------------------------

  const [searchValue, setSearchValue] = React.useState('');
  const [debouncedSearch, setDebouncedSearch] = React.useState('');
  const [selectedStatuses, setSelectedStatuses] = React.useState<CandidateStatus[]>([]);
  const [currentPage, setCurrentPage] = React.useState(1);

  // Reset to page 1 when filters change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, selectedStatuses]);

  // ---------------------------------------------------------------------------
  // Data Fetching
  // ---------------------------------------------------------------------------

  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
  } = useCandidates({
    page: currentPage,
    pageSize: 20,
    statuses: selectedStatuses.length > 0 ? selectedStatuses : undefined,
    search: debouncedSearch || undefined,
    sortBy: 'lastActivity',
    sortOrder: 'desc',
  });

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  const handleSearch = React.useCallback((value: string) => {
    setDebouncedSearch(value);
  }, []);

  const handleSearchChange = React.useCallback((value: string) => {
    setSearchValue(value);
  }, []);

  const handleStatusFilterChange = React.useCallback((statuses: CandidateStatus[]) => {
    setSelectedStatuses(statuses);
  }, []);

  const handleRowClick = React.useCallback(
    (candidateId: string) => {
      router.push(`/candidates/${candidateId}`);
    },
    [router],
  );

  const handlePageChange = React.useCallback((page: number) => {
    setCurrentPage(page);
  }, []);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Candidate Pipeline</h1>
        <p className="text-sm text-muted-foreground">
          Manage and track candidates through your hiring pipeline.
        </p>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <SearchInput
          onSearch={handleSearch}
          value={searchValue}
          onChange={handleSearchChange}
          placeholder="Search by name or role..."
          debounceMs={300}
          maxLength={100}
          className="w-full sm:w-72"
          aria-label="Search candidates by name or role"
        />
        <StatusFilter
          selectedStatuses={selectedStatuses}
          onChange={handleStatusFilterChange}
        />
      </div>

      {/* Content */}
      {isLoading ? (
        <LoadingSkeleton variant="list" rows={8} />
      ) : isError ? (
        <ErrorState
          message="Failed to load candidates"
          description={error?.message || 'An error occurred while fetching candidates.'}
          onRetry={() => refetch()}
        />
      ) : !data || data.items.length === 0 ? (
        <EmptyState
          icon={<UsersIcon className="h-10 w-10 text-muted-foreground" />}
          title="No candidates found"
          description={
            debouncedSearch || selectedStatuses.length > 0
              ? 'Try adjusting your search or filters to find candidates.'
              : 'Get started by adding your first candidate to the pipeline.'
          }
          actionHref="/candidates/new"
          actionLabel="Add Candidate"
        />
      ) : (
        <>
          {/* Candidate Table */}
          <div className="rounded-md border">
            <table className="w-full" role="grid" aria-label="Candidate pipeline list">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th
                    scope="col"
                    className="px-4 py-3 text-left text-sm font-medium text-muted-foreground"
                  >
                    Name
                  </th>
                  <th
                    scope="col"
                    className="hidden px-4 py-3 text-left text-sm font-medium text-muted-foreground sm:table-cell"
                  >
                    Role
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-3 text-left text-sm font-medium text-muted-foreground"
                  >
                    Status
                  </th>
                  <th
                    scope="col"
                    className="hidden px-4 py-3 text-right text-sm font-medium text-muted-foreground md:table-cell"
                  >
                    Last Activity
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((candidate) => (
                  <CandidateRow
                    key={candidate.id}
                    candidate={candidate}
                    onClick={handleRowClick}
                  />
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {data.totalPages > 1 && (
            <Pagination
              currentPage={data.page}
              totalPages={data.totalPages}
              total={data.total}
              pageSize={data.pageSize}
              onPageChange={handlePageChange}
            />
          )}
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Candidate Row Component
// ---------------------------------------------------------------------------

interface CandidateRowProps {
  candidate: Candidate;
  onClick: (id: string) => void;
}

function CandidateRow({ candidate, onClick }: CandidateRowProps) {
  // Resolve optimistic status (updates within 100ms)
  const displayStatus = resolveDisplayStatus(candidate.id, candidate.status);

  const relativeTime = React.useMemo(() => {
    try {
      return formatDistanceToNow(new Date(candidate.lastActivityAt), { addSuffix: true });
    } catch {
      return 'Unknown';
    }
  }, [candidate.lastActivityAt]);

  return (
    <tr
      className="cursor-pointer border-b transition-colors hover:bg-muted/50 focus-within:bg-muted/50 last:border-b-0"
      onClick={() => onClick(candidate.id)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick(candidate.id);
        }
      }}
      tabIndex={0}
      role="row"
      aria-label={`${candidate.name}, ${candidate.currentRole || 'No role'}, Status: ${displayStatus}`}
    >
      <td className="px-4 py-3">
        <div className="flex flex-col">
          <span className="text-sm font-medium text-foreground">{candidate.name}</span>
          <span className="text-xs text-muted-foreground sm:hidden">
            {candidate.currentRole || '—'}
          </span>
        </div>
      </td>
      <td className="hidden px-4 py-3 sm:table-cell">
        <span className="text-sm text-muted-foreground">
          {candidate.currentRole || '—'}
        </span>
      </td>
      <td className="px-4 py-3">
        <StatusBadge status={displayStatus} size="sm" />
      </td>
      <td className="hidden px-4 py-3 text-right md:table-cell">
        <time
          dateTime={candidate.lastActivityAt}
          className="text-xs text-muted-foreground"
        >
          {relativeTime}
        </time>
      </td>
    </tr>
  );
}
