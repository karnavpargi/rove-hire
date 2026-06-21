'use client';

import * as React from 'react';
import {
  type ColumnDef,
  type SortingState,
  type VisibilityState,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { formatDistanceToNow } from 'date-fns';
import { ChevronsUpDown, Columns3 } from 'lucide-react';
import type { Candidate } from '@rove-hire/shared';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { StatusBadge } from '@/components/shared/status-badge';
import { resolveDisplayStatus } from '@/lib/optimistic-updates';
import { cn } from '@/lib/utils';

interface CandidateDataTableProps {
  candidates: Candidate[];
  onRowClick: (id: string) => void;
}

const COLUMN_LABELS: Record<string, string> = {
  name: 'Name',
  currentRole: 'Role',
  status: 'Status',
  lastActivityAt: 'Last Activity',
};

export function CandidateDataTable({ candidates, onRowClick }: CandidateDataTableProps) {
  const [sorting, setSorting] = React.useState<SortingState>([
    { id: 'lastActivityAt', desc: true },
  ]);
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});

  const columns = React.useMemo<ColumnDef<Candidate>[]>(
    () => [
      {
        accessorKey: 'name',
        header: ({ column }) => (
          <Button
            variant="ghost"
            size="sm"
            className="-ml-3 h-8"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            Name
            <ChevronsUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => <span className="font-medium text-foreground">{row.original.name}</span>,
      },
      {
        accessorKey: 'currentRole',
        header: 'Role',
        cell: ({ row }) => (
          <span className="text-muted-foreground">{row.original.currentRole || '—'}</span>
        ),
        meta: { className: 'hidden sm:table-cell' },
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => (
          <StatusBadge
            status={resolveDisplayStatus(row.original.id, row.original.status)}
            size="sm"
          />
        ),
      },
      {
        accessorKey: 'lastActivityAt',
        header: ({ column }) => (
          <Button
            variant="ghost"
            size="sm"
            className="-ml-3 h-8"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            Last Activity
            <ChevronsUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => {
          let relativeTime = 'Unknown';
          try {
            relativeTime = formatDistanceToNow(new Date(row.original.lastActivityAt), {
              addSuffix: true,
            });
          } catch {
            /* keep default */
          }
          return (
            <time dateTime={row.original.lastActivityAt} className="text-xs text-muted-foreground">
              {relativeTime}
            </time>
          );
        },
        meta: { className: 'hidden md:table-cell text-right' },
      },
    ],
    [],
  );

  const table = useReactTable({
    data: candidates,
    columns,
    state: { sorting, columnVisibility },
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-8">
              <Columns3 className="mr-2 h-4 w-4" />
              Columns
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuLabel>Toggle columns</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {table
              .getAllColumns()
              .filter((column) => column.getCanHide())
              .map((column) => (
                <DropdownMenuCheckboxItem
                  key={column.id}
                  checked={column.getIsVisible()}
                  onCheckedChange={(value) => column.toggleVisibility(!!value)}
                >
                  {COLUMN_LABELS[column.id] ?? column.id}
                </DropdownMenuCheckboxItem>
              ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="rounded-md border">
        <Table aria-label="Candidate pipeline list">
          <TableHeader className="sticky top-0 z-10 border-b bg-card">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    className={cn(
                      (header.column.columnDef.meta as { className?: string } | undefined)
                        ?.className,
                    )}
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.map((row) => {
              const candidate = row.original;
              const displayStatus = resolveDisplayStatus(candidate.id, candidate.status);
              return (
                <TableRow
                  key={row.id}
                  className="cursor-pointer transition-colors duration-200 hover:bg-muted/50"
                  onClick={() => onRowClick(candidate.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onRowClick(candidate.id);
                    }
                  }}
                  tabIndex={0}
                  aria-label={`${candidate.name}, ${candidate.currentRole || 'No role'}, Status: ${displayStatus}`}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell
                      key={cell.id}
                      className={cn(
                        (cell.column.columnDef.meta as { className?: string } | undefined)
                          ?.className,
                      )}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

/** Mobile card list fallback for pipeline view */
export function CandidateCardList({ candidates, onRowClick }: CandidateDataTableProps) {
  return (
    <div className="space-y-3 md:hidden" role="list" aria-label="Candidate pipeline list">
      {candidates.map((candidate) => {
        const displayStatus = resolveDisplayStatus(candidate.id, candidate.status);
        let relativeTime = 'Unknown';
        try {
          relativeTime = formatDistanceToNow(new Date(candidate.lastActivityAt), {
            addSuffix: true,
          });
        } catch {
          /* keep default */
        }

        return (
          <button
            key={candidate.id}
            type="button"
            role="listitem"
            onClick={() => onRowClick(candidate.id)}
            className="w-full cursor-pointer rounded-lg border bg-card p-4 text-left transition-colors duration-200 hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label={`${candidate.name}, ${candidate.currentRole || 'No role'}, Status: ${displayStatus}`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-foreground">{candidate.name}</p>
                <p className="truncate text-sm text-muted-foreground">
                  {candidate.currentRole || '—'}
                </p>
              </div>
              <StatusBadge status={displayStatus} size="sm" />
            </div>
            <time
              dateTime={candidate.lastActivityAt}
              className="mt-2 block text-xs text-muted-foreground"
            >
              {relativeTime}
            </time>
          </button>
        );
      })}
    </div>
  );
}
