/**
 * Success page displayed after a candidate successfully submits their application.
 *
 * Validates: Requirements 5.3
 */

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';

export default function CandidateApplicationSuccessPage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-6 w-6 text-green-600 dark:text-green-400"
              aria-hidden="true"
            >
              <path d="M20 6 9 17l-5-5" />
            </svg>
          </div>
          <CardTitle className="text-xl">Application Received</CardTitle>
          <CardDescription>
            Thank you for completing your application.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Your information has been submitted successfully. The recruitment team will review
            your application and be in touch soon. No further action is required on your end.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
