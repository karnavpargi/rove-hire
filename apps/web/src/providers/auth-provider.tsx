/**
 * Auth provider — initializes cross-tab synchronization and
 * handles session management on the client side.
 *
 * Validates: Requirements 28.1, 28.2, 28.3
 */

'use client';

import { useEffect, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { initCrossTabSync, useSessionStore } from '@/stores/session-store';
import { saveFormData } from '@/lib/form-persistence';

/** Pages that don't require authentication */
const PUBLIC_PATHS = ['/login', '/candidate-application'];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some((p) => pathname.startsWith(p));
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();

  // Initialize cross-tab sync (BroadcastChannel)
  useEffect(() => {
    const cleanup = initCrossTabSync();
    return cleanup;
  }, []);

  // Listen for session clear (from other tabs or 401) and redirect
  useEffect(() => {
    const unsubscribe = useSessionStore.subscribe((state, prevState) => {
      // Session was cleared (logout from another tab or 401)
      if (prevState.isAuthenticated && !state.isAuthenticated) {
        const currentPath = window.location.pathname;
        if (!isPublicPath(currentPath)) {
          // Preserve unsaved form data before redirect
          const forms = document.querySelectorAll('form');
          forms.forEach((form) => {
            const formData = new FormData(form);
            const data: Record<string, unknown> = {};
            formData.forEach((value, key) => {
              data[key] = value;
            });
            if (Object.keys(data).length > 0) {
              saveFormData(currentPath, data);
            }
          });
          router.push('/login');
        }
      }
    });

    return unsubscribe;
  }, [router]);

  return <>{children}</>;
}
