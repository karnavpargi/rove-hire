'use client';

/**
 * Screen displayed when a magic link token has already been consumed.
 *
 * Validates: Requirements 5.5
 */

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';

export function LinkUsedScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-6 w-6 text-muted-foreground"
              aria-hidden="true"
            >
              <path d="M9 12l2 2 4-4" />
              <circle cx="12" cy="12" r="10" />
            </svg>
          </div>
          <CardTitle className="text-xl">Link Already Used</CardTitle>
          <CardDescription>
            This application link has already been used to submit your information.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Each link can only be used once. If you believe this is an error, please contact the
            recruiter who sent you the link.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
