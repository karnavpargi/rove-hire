/**
 * Form data persistence utilities.
 * Saves form data to localStorage on session expiry and restores after re-auth.
 * Discards saved form state older than 24 hours.
 *
 * Validates: Requirements 28.4, 28.5, 28.6
 */

const FORM_DATA_PREFIX = 'rove_form_';
const MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours

interface PersistedFormData {
  data: Record<string, unknown>;
  path: string;
  savedAt: number;
}

/**
 * Save form data to localStorage keyed by the current path.
 */
export function saveFormData(path: string, data: Record<string, unknown>): void {
  if (typeof window === 'undefined') return;

  const entry: PersistedFormData = {
    data,
    path,
    savedAt: Date.now(),
  };

  try {
    localStorage.setItem(`${FORM_DATA_PREFIX}${path}`, JSON.stringify(entry));
  } catch {
    // localStorage full or unavailable — silently fail
  }
}

/**
 * Restore form data for a given path. Returns null if no data or expired.
 */
export function restoreFormData(path: string): Record<string, unknown> | null {
  if (typeof window === 'undefined') return null;

  try {
    const raw = localStorage.getItem(`${FORM_DATA_PREFIX}${path}`);
    if (!raw) return null;

    const entry: PersistedFormData = JSON.parse(raw);

    // Discard if older than 24 hours
    if (Date.now() - entry.savedAt > MAX_AGE_MS) {
      localStorage.removeItem(`${FORM_DATA_PREFIX}${path}`);
      return null;
    }

    return entry.data;
  } catch {
    return null;
  }
}

/**
 * Remove persisted form data for a given path.
 */
export function clearFormData(path: string): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(`${FORM_DATA_PREFIX}${path}`);
}

/**
 * Remove all expired form data from localStorage.
 */
export function cleanupExpiredFormData(): void {
  if (typeof window === 'undefined') return;

  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(FORM_DATA_PREFIX)) {
        const raw = localStorage.getItem(key);
        if (raw) {
          const entry: PersistedFormData = JSON.parse(raw);
          if (Date.now() - entry.savedAt > MAX_AGE_MS) {
            keysToRemove.push(key);
          }
        }
      }
    }
    keysToRemove.forEach((key) => localStorage.removeItem(key));
  } catch {
    // Silently fail
  }
}
