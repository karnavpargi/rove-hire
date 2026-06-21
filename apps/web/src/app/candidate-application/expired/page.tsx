/**
 * Expired link page displayed when a magic link token has passed its 14-day expiry.
 *
 * Validates: Requirements 5.4
 */

import { ClockIcon } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';

export default function CandidateApplicationExpiredPage() {
  return (
    <Card className="w-full text-center">
      <CardHeader>
        <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30">
          <ClockIcon className="h-6 w-6 text-amber-600 dark:text-amber-400" aria-hidden="true" />
        </div>
        <CardTitle className="text-heading-2">Link Expired</CardTitle>
        <CardDescription>This application link is no longer valid.</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-body text-muted-foreground">
          Application links expire after 14 days for security reasons. Please contact the recruiter
          who sent you this link to request a new one.
        </p>
      </CardContent>
    </Card>
  );
}
