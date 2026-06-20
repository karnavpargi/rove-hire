'use client';

/**
 * Screen displayed when a magic link token is invalid or not found.
 *
 * Validates: Requirements 5.6
 */

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';

export function LinkInvalidScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-6 w-6 text-destructive"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="15" y1="9" x2="9" y2="15" />
              <line x1="9" y1="9" x2="15" y2="15" />
            </svg>
          </div>
          <CardTitle className="text-xl">Invalid Link</CardTitle>
          <CardDescription>
            This application link is not valid. It may have been entered incorrectly.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Please double-check the URL you received from the recruiter. If the problem persists,
            contact the person who sent you this link.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
