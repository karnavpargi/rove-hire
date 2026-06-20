/**
 * Shared constants for the ROVE Hire platform.
 */

export * from './pipeline';
export * from './limits';

/** Supported currencies for salary offers */
export const SUPPORTED_CURRENCIES = ['USD', 'EUR', 'GBP', 'INR', 'AED'] as const;

/** File upload constraints (convenience re-export) */
export const FILE_CONSTRAINTS = {
  MAX_SIZE_BYTES: 10 * 1024 * 1024, // 10MB
  ALLOWED_MIME_TYPES: ['application/pdf'],
} as const;

/** Magic link constraints (convenience re-export) */
export const MAGIC_LINK_CONSTRAINTS = {
  EXPIRY_DAYS: 14,
  TOKEN_BYTES: 32, // 256-bit entropy
} as const;

/** Session constraints */
export const SESSION_CONSTRAINTS = {
  MAX_LIFETIME_HOURS: 8,
  RATE_LIMIT_ATTEMPTS: 5,
  RATE_LIMIT_WINDOW_MINUTES: 15,
  RATE_LIMIT_PER_IP_PER_MINUTE: 10,
} as const;
