'use client';

/**
 * Screen displayed when a magic link token is invalid or not found.
 *
 * Validates: Requirements 5.6
 */

import { XCircleIcon } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';

export function LinkInvalidScreen() {
  return (
    <Card className="w-full text-center">
      <CardHeader>
        <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
          <XCircleIcon className="h-6 w-6 text-destructive" aria-hidden="true" />
        </div>
        <CardTitle className="text-heading-2">Invalid Link</CardTitle>
        <CardDescription>
          This application link is not valid. It may have been entered incorrectly.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-body text-muted-foreground">
          Please double-check the URL you received from the recruiter. If the problem persists,
          contact the person who sent you this link.
        </p>
      </CardContent>
    </Card>
  );
}
