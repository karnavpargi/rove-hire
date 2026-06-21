'use client';

/**
 * Screen displayed when a magic link token has already been consumed.
 *
 * Validates: Requirements 5.5
 */

import { CheckCircle2Icon } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';

export function LinkUsedScreen() {
  return (
    <Card className="w-full text-center">
      <CardHeader>
        <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
          <CheckCircle2Icon className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
        </div>
        <CardTitle className="text-heading-2">Link Already Used</CardTitle>
        <CardDescription>
          This application link has already been used to submit your information.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-body text-muted-foreground">
          Each link can only be used once. If you believe this is an error, please contact the
          recruiter who sent you the link.
        </p>
      </CardContent>
    </Card>
  );
}
