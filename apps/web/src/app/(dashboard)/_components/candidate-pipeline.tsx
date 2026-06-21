'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { UsersIcon } from 'lucide-react';
import type { CandidateStatus } from '@rove-hire/shared';

import { SearchInput } from '@/components/shared/search-input';
import { LoadingSkeleton } from '@/components/shared/loading-skeleton';
import { EmptyState } from '@/components/shared/empty-state';
import { ErrorState } from '@/components/shared/error-state';
import { CandidateCardList, CandidateDataTable } from '@/components/shared/candidate-data-table';
import { useCandidates } from '@/hooks/use-candidates';
import { StatusFilter } from './status-filter';
import { Pagination } from './pagination';

export interface CandidatePipelineProps {
  title?: string;
  description?: string;
  showHeader?: boolean;
}

export function CandidatePipeline({
  title = 'Candidate Pipeline',
  description = 'Manage and track candidates through your hiring pipeline.',
  showHeader = true,
}: CandidatePipelineProps) {
  const router = useRouter();

  const [searchValue, setSearchValue] = React.useState('');
  const [debouncedSearch, setDebouncedSearch] = React.useState('');
  const [selectedStatuses, setSelectedStatuses] = React.useState<CandidateStatus[]>([]);
  const [currentPage, setCurrentPage] = React.useState(1);

  React.useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, selectedStatuses]);

  const { data, isLoading, isError, error, refetch } = useCandidates({
    page: currentPage,
    pageSize: 20,
    statuses: selectedStatuses.length > 0 ? selectedStatuses : undefined,
    search: debouncedSearch || undefined,
    sortBy: 'lastActivity',
    sortOrder: 'desc',
  });

  const handleSearch = React.useCallback((value: string) => {
    setDebouncedSearch(value);
  }, []);

  const handleRowClick = React.useCallback(
    (candidateId: string) => {
      router.push(`/candidates/${candidateId}`);
    },
    [router],
  );

  const [isMobile, setIsMobile] = React.useState(false);

  React.useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 767px)');
    const update = () => setIsMobile(mediaQuery.matches);
    update();
    mediaQuery.addEventListener('change', update);
    return () => mediaQuery.removeEventListener('change', update);
  }, []);

  return (
    <div className="space-y-6">
      {showHeader && (
        <div>
          <h2 className="text-heading-2">{title}</h2>
          <p className="text-body text-muted-foreground">{description}</p>
        </div>
      )}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <SearchInput
          onSearch={handleSearch}
          value={searchValue}
          onChange={setSearchValue}
          placeholder="Search by name or role..."
          debounceMs={300}
          maxLength={100}
          className="w-full sm:w-72"
          aria-label="Search candidates by name or role"
        />
        <StatusFilter selectedStatuses={selectedStatuses} onChange={setSelectedStatuses} />
      </div>

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
          {isMobile ? (
            <CandidateCardList candidates={data.items} onRowClick={handleRowClick} />
          ) : (
            <CandidateDataTable candidates={data.items} onRowClick={handleRowClick} />
          )}

          {data.totalPages > 1 && (
            <Pagination
              currentPage={data.page}
              totalPages={data.totalPages}
              total={data.total}
              pageSize={data.pageSize}
              onPageChange={setCurrentPage}
            />
          )}
        </>
      )}
    </div>
  );
}
