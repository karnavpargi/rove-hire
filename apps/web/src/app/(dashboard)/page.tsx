/**
 * Dashboard Page — Candidate Pipeline with summary stats
 */

'use client';

import { DashboardStatsHeader } from './_components/dashboard-stats-header';
import { CandidatePipeline } from './_components/candidate-pipeline';

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      <DashboardStatsHeader />
      <CandidatePipeline showHeader={false} />
    </div>
  );
}
