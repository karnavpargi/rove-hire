/**
 * Success page displayed after a candidate successfully submits their application.
 *
 * Validates: Requirements 5.3
 */

import { CheckCircleIcon } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';

export default function CandidateApplicationSuccessPage() {
  return (
    <Card className="w-full text-center">
      <CardHeader>
        <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
          <CheckCircleIcon
            className="h-6 w-6 text-green-600 dark:text-green-400"
            aria-hidden="true"
          />
        </div>
        <CardTitle className="text-heading-2">Application Received</CardTitle>
        <CardDescription>Thank you for completing your application.</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-body text-muted-foreground">
          Your information has been submitted successfully. The recruitment team will review your
          application and be in touch soon. No further action is required on your end.
        </p>
      </CardContent>
    </Card>
  );
}
