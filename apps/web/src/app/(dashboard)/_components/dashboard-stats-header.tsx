'use client';

import * as React from 'react';
import Link from 'next/link';
import { UserPlusIcon, UsersIcon, CalendarIcon, SendIcon, CheckCircleIcon } from 'lucide-react';
import { CandidateStatus } from '@rove-hire/shared';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useCandidates } from '@/hooks/use-candidates';

const IN_PROGRESS_STATUSES: CandidateStatus[] = [
  CandidateStatus.FormSubmitted,
  CandidateStatus.InterviewScheduled,
];

export function DashboardStatsHeader() {
  const { data, isLoading } = useCandidates({
    page: 1,
    pageSize: 100,
    sortBy: 'lastActivity',
    sortOrder: 'desc',
  });

  const stats = React.useMemo(() => {
    if (!data?.items) {
      return { total: 0, applied: 0, inProgress: 0, offerSent: 0, hired: 0 };
    }

    const items = data.items;
    return {
      total: data.total,
      applied: items.filter((c) => c.status === CandidateStatus.Applied).length,
      inProgress: items.filter((c) => IN_PROGRESS_STATUSES.includes(c.status)).length,
      offerSent: items.filter((c) => c.status === CandidateStatus.OfferSent).length,
      hired: items.filter((c) => c.status === CandidateStatus.Hired).length,
    };
  }, [data]);

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-20 animate-pulse rounded-lg bg-muted" />
        ))}
      </div>
    );
  }

  const statCards = [
    { label: 'Total Candidates', value: stats.total, icon: UsersIcon },
    { label: 'Applied', value: stats.applied, icon: UserPlusIcon },
    { label: 'In Progress', value: stats.inProgress, icon: CalendarIcon },
    { label: 'Offer Sent', value: stats.offerSent, icon: SendIcon },
    { label: 'Hired', value: stats.hired, icon: CheckCircleIcon },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-heading-1">Dashboard</h1>
          <p className="text-body text-muted-foreground">
            Overview of your hiring pipeline and candidate activity.
          </p>
        </div>
        <Button asChild className="shrink-0">
          <Link href="/candidates/new">
            <UserPlusIcon className="mr-2 h-4 w-4" />
            Add Candidate
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {statCards.map(({ label, value, icon: Icon }) => (
          <Card key={label} className="transition-colors duration-200 hover:border-primary/30">
            <CardContent className="flex items-center gap-3 p-4">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                <Icon className="h-4 w-4 text-primary" aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-xs text-muted-foreground">{label}</p>
                <p className="text-xl font-semibold tabular-nums text-foreground">{value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
