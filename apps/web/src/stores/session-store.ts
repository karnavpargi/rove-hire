/**
 * Zustand session store with cross-tab synchronization.
 * Uses BroadcastChannel for logout across all tabs.
 *
 * Validates: Requirements 1.5, 1.6, 28.1, 28.2, 28.3
 */

'use client';

import { create } from 'zustand';
import type { HrUserPayload } from '@rove-hire/shared';

const BROADCAST_CHANNEL_NAME = 'rove-hire-auth';

type AuthMessage = { type: 'LOGOUT' } | { type: 'LOGIN'; user: HrUserPayload };

export interface SessionStore {
  /** Current authenticated user or null */
  user: HrUserPayload | null;
  /** Whether auth state has been initialized (checked cookie/me query) */
  isInitialized: boolean;
  /** Whether user is authenticated */
  isAuthenticated: boolean;
  /** Session expiration timestamp */
  sessionExpiresAt: number | null;
  /** Set user session after login or auth check */
  setSession: (user: HrUserPayload, expiresAt?: number) => void;
  /** Clear session on logout or 401 */
  clearSession: () => void;
  /** Mark as initialized after initial auth check */
  setInitialized: () => void;
  /** Broadcast logout to other tabs */
  broadcastLogout: () => void;
  /** Broadcast login to other tabs */
  broadcastLogin: (user: HrUserPayload) => void;
}

let broadcastChannel: BroadcastChannel | null = null;

function getBroadcastChannel(): BroadcastChannel | null {
  if (typeof window === 'undefined') return null;
  if (!broadcastChannel) {
    try {
      broadcastChannel = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
    } catch {
      // BroadcastChannel not supported — fallback to storage event
      return null;
    }
  }
  return broadcastChannel;
}

export const useSessionStore = create<SessionStore>((set) => ({
  user: null,
  isInitialized: false,
  isAuthenticated: false,
  sessionExpiresAt: null,

  setSession: (user, expiresAt) =>
    set({
      user,
      isAuthenticated: true,
      sessionExpiresAt: expiresAt ?? null,
    }),

  clearSession: () =>
    set({
      user: null,
      isAuthenticated: false,
      sessionExpiresAt: null,
    }),

  setInitialized: () => set({ isInitialized: true }),

  broadcastLogout: () => {
    const channel = getBroadcastChannel();
    if (channel) {
      channel.postMessage({ type: 'LOGOUT' } satisfies AuthMessage);
    } else if (typeof window !== 'undefined') {
      // Fallback: use localStorage event for cross-tab communication
      localStorage.setItem('rove-hire-logout', Date.now().toString());
    }
  },

  broadcastLogin: (user) => {
    const channel = getBroadcastChannel();
    if (channel) {
      channel.postMessage({ type: 'LOGIN', user } satisfies AuthMessage);
    }
  },
}));

/**
 * Initialize cross-tab auth synchronization.
 * Call this once in a top-level provider.
 */
export function initCrossTabSync(): () => void {
  const channel = getBroadcastChannel();
  const cleanups: Array<() => void> = [];

  if (channel) {
    const handler = (event: MessageEvent<AuthMessage>) => {
      if (event.data.type === 'LOGOUT') {
        useSessionStore.getState().clearSession();
      } else if (event.data.type === 'LOGIN') {
        useSessionStore.getState().setSession(event.data.user);
      }
    };
    channel.addEventListener('message', handler);
    cleanups.push(() => channel.removeEventListener('message', handler));
  } else if (typeof window !== 'undefined') {
    // Fallback: listen for storage events
    const handler = (event: StorageEvent) => {
      if (event.key === 'rove-hire-logout') {
        useSessionStore.getState().clearSession();
      }
    };
    window.addEventListener('storage', handler);
    cleanups.push(() => window.removeEventListener('storage', handler));
  }

  return () => cleanups.forEach((fn) => fn());
}
