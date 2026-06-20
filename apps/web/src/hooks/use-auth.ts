/**
 * Authentication hook — provides login, logout, and session state.
 * Handles 401 redirects, form data preservation, and cross-tab logout.
 *
 * Validates: Requirements 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 28.1-28.6
 */

'use client';

import { useCallback, useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { gql } from 'graphql-request';
import { useSessionStore } from '@/stores/session-store';
import {
  graphqlClient,
  isAuthenticationError,
  classifyError,
} from '@/lib/graphql-client';
import { saveFormData, cleanupExpiredFormData } from '@/lib/form-persistence';
import { GraphQLErrorCode } from '@rove-hire/shared';
import type { HrUserPayload } from '@rove-hire/shared';

/** GraphQL mutation for login */
const LOGIN_MUTATION = gql`
  mutation Login($email: String!, $password: String!) {
    login(email: $email, password: $password) {
      user {
        id
        email
        name
      }
    }
  }
`;

/** GraphQL query to check current session */
const ME_QUERY = gql`
  query Me {
    me {
      id
      email
      name
    }
  }
`;

/** GraphQL mutation for logout */
const LOGOUT_MUTATION = gql`
  mutation Logout {
    logout
  }
`;

export interface LoginError {
  message: string;
  retryAfter?: number;
}

export interface UseAuth {
  user: HrUserPayload | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: LoginError }>;
  logout: () => Promise<void>;
  checkSession: () => Promise<void>;
}

export function useAuth(): UseAuth {
  const router = useRouter();
  const pathname = usePathname();
  const {
    user,
    isAuthenticated,
    isInitialized,
    setSession,
    clearSession,
    setInitialized,
    broadcastLogout,
    broadcastLogin,
  } = useSessionStore();

  const pathnameRef = useRef(pathname);
  pathnameRef.current = pathname;

  // Check session on mount (validate JWT cookie via me query)
  const checkSession = useCallback(async () => {
    try {
      const data = await graphqlClient.request<{ me: HrUserPayload | null }>(ME_QUERY);
      if (data.me) {
        setSession(data.me);
      } else {
        clearSession();
      }
    } catch (error) {
      if (isAuthenticationError(error)) {
        clearSession();
      }
      // On network error, leave state as-is (offline scenario)
    } finally {
      setInitialized();
    }
  }, [setSession, clearSession, setInitialized]);

  useEffect(() => {
    if (!isInitialized) {
      checkSession();
    }
    // Clean up expired form data on mount
    cleanupExpiredFormData();
  }, [isInitialized, checkSession]);

  // Login handler
  const login = useCallback(
    async (
      email: string,
      password: string,
    ): Promise<{ success: boolean; error?: LoginError }> => {
      try {
        const data = await graphqlClient.request<{
          login: { user: HrUserPayload };
        }>(LOGIN_MUTATION, { email, password });

        setSession(data.login.user);
        broadcastLogin(data.login.user);
        return { success: true };
      } catch (error) {
        const classified = classifyError(error);

        if (classified.type === GraphQLErrorCode.RATE_LIMIT_ERROR) {
          return {
            success: false,
            error: {
              message: 'Too many login attempts. Please try again later.',
              retryAfter: classified.retryAfter,
            },
          };
        }

        if (
          classified.type === GraphQLErrorCode.AUTHENTICATION_ERROR ||
          classified.type === GraphQLErrorCode.VALIDATION_ERROR
        ) {
          return {
            success: false,
            error: { message: 'Invalid email or password.' },
          };
        }

        if (classified.type === 'NETWORK_ERROR') {
          return {
            success: false,
            error: { message: 'Network error. Please check your connection and try again.' },
          };
        }

        return {
          success: false,
          error: { message: 'Something went wrong. Please try again.' },
        };
      }
    },
    [setSession, broadcastLogin],
  );

  // Logout handler
  const logout = useCallback(async () => {
    try {
      await graphqlClient.request(LOGOUT_MUTATION);
    } catch {
      // Even if server logout fails, clear local state
    }
    clearSession();
    broadcastLogout();
    router.push('/login');
  }, [clearSession, broadcastLogout, router]);

  // Handle 401 redirect with form data preservation
  const handleUnauthorized = useCallback(() => {
    if (typeof window !== 'undefined' && pathnameRef.current !== '/login') {
      const forms = document.querySelectorAll('form');
      forms.forEach((form) => {
        const formData = new FormData(form);
        const data: Record<string, unknown> = {};
        formData.forEach((value, key) => {
          data[key] = value;
        });
        if (Object.keys(data).length > 0) {
          saveFormData(pathnameRef.current, data);
        }
      });
    }
    clearSession();
    router.push('/login');
  }, [clearSession, router]);

  // Redirect unauthenticated users from protected routes
  useEffect(() => {
    if (isInitialized && !isAuthenticated && pathname !== '/login' && !pathname.startsWith('/candidate-application')) {
      handleUnauthorized();
    }
  }, [isInitialized, isAuthenticated, pathname, handleUnauthorized]);

  return {
    user,
    isAuthenticated,
    isLoading: !isInitialized,
    login,
    logout,
    checkSession,
  };
}
