'use client';

/**
 * Public candidate application form page.
 * Validates the magic link token on mount and displays:
 * - The application form if token is valid
 * - "Link expired" redirect if token is expired
 * - "Link already used" screen if token was consumed
 * - "Link invalid" screen if token doesn't exist
 *
 * Validates: Requirements 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8, 5.9, 16.4
 */

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { graphqlClient } from '@/lib/graphql-client';
import {
  VALIDATE_MAGIC_LINK_QUERY,
  SUBMIT_APPLICATION_MUTATION,
  type MagicLinkValidationResult,
  type ApplicationFormInput,
  type SubmitApplicationResult,
} from '@/lib/graphql/magic-link';
import { ApplicationForm } from './application-form';
import { LinkUsedScreen } from './link-used-screen';
import { LinkInvalidScreen } from './link-invalid-screen';
import { LoadingSkeleton } from '@/components/shared/loading-skeleton';

type TokenStatus = 'loading' | 'valid' | 'expired' | 'used' | 'invalid';

export default function CandidateApplicationPage() {
  const params = useParams();
  const router = useRouter();
  const token = params.token as string;

  const [status, setStatus] = useState<TokenStatus>('loading');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Validate token on mount
  useEffect(() => {
    async function validateToken() {
      try {
        const data = await graphqlClient.request<MagicLinkValidationResult>(
          VALIDATE_MAGIC_LINK_QUERY,
          { token },
        );

        if (data.validateMagicLink.valid) {
          setStatus('valid');
        } else {
          const reason = data.validateMagicLink.reason;
          if (reason === 'expired') {
            router.replace('/candidate-application/expired');
          } else if (reason === 'used') {
            setStatus('used');
          } else {
            setStatus('invalid');
          }
        }
      } catch {
        setStatus('invalid');
      }
    }

    if (token) {
      validateToken();
    }
  }, [token, router]);

  async function handleSubmit(formData: ApplicationFormInput) {
    setSubmitting(true);
    setSubmitError(null);

    try {
      await graphqlClient.request<SubmitApplicationResult>(SUBMIT_APPLICATION_MUTATION, {
        token,
        input: formData,
      });
      router.push('/candidate-application/success');
    } catch (error: unknown) {
      // Check if the error indicates the link was already used (concurrent submission)
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';

      if (errorMessage.toLowerCase().includes('already used')) {
        setStatus('used');
      } else {
        setSubmitError(
          'We couldn\u2019t submit your application. Please check your details and try again.',
        );
      }
    } finally {
      setSubmitting(false);
    }
  }

  // Loading state
  if (status === 'loading') {
    return <LoadingSkeleton variant="card" />;
  }

  // Link already used
  if (status === 'used') {
    return <LinkUsedScreen />;
  }

  // Link invalid/not found
  if (status === 'invalid') {
    return <LinkInvalidScreen />;
  }

  // Valid token — show the form
  return (
    <div className="space-y-4">
      <div className="text-center">
        <p className="text-sm text-muted-foreground">
          Complete your application to continue in the hiring process.
        </p>
      </div>
      <ApplicationForm onSubmit={handleSubmit} submitting={submitting} submitError={submitError} />
    </div>
  );
}
