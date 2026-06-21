/**
 * TanStack Query provider for the application.
 * Configures default options including error handling strategy:
 * - No retry on auth/authorization errors
 * - Up to 2 retries on network and internal errors
 * - Global mutation error callback dispatches toasts for network/conflict/rate-limit errors
 *
 * Validates: Requirements 17.3, 17.6, 12.5, 12.6
 */

'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';
import { GraphQLErrorCode } from '@rove-hire/shared';
import {
  isClientError,
  extractErrorExtensions,
  handleGraphQLError,
} from '@/lib/graphql-client';

export function QueryProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            retry: (failureCount: number, error: Error) => {
              if (isClientError(error)) {
                const ext = extractErrorExtensions(error);
                if (
                  ext?.code === GraphQLErrorCode.AUTHENTICATION_ERROR ||
                  ext?.code === GraphQLErrorCode.AUTHORIZATION_ERROR ||
                  ext?.code === GraphQLErrorCode.VALIDATION_ERROR ||
                  ext?.code === GraphQLErrorCode.NOT_FOUND
                ) {
                  return false;
                }
              }
              return failureCount < 2;
            },
          },
          mutations: {
            retry: false,
            onError: (error: Error) => {
              handleGraphQLError(error);
            },
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
