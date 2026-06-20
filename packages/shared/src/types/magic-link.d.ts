export interface MagicLinkValidation {
    valid: boolean;
    reason?: 'expired' | 'used' | 'invalid';
    candidateId?: string;
}
export interface MagicLinkGenerateResult {
    url: string;
    expiresAt: string;
}
