/**
 * Magic link types shared between frontend and backend.
 */

/** Result of magic link token validation */
export interface MagicLinkValidation {
  valid: boolean;
  reason?: 'expired' | 'used' | 'invalid';
  candidateId?: string;
}

/** Result of generating a new magic link */
export interface MagicLinkGenerateResult {
  url: string;
  expiresAt: string;
}
