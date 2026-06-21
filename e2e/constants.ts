/**
 * Deterministic seed IDs and magic-link tokens for E2E tests.
 * Must stay in sync with apps/api/prisma/seed.ts
 */

export const SEED_IDS = {
  candidates: {
    applied: '00000000-0000-4000-c000-000000000001',
    formSubmitted: '00000000-0000-4000-c000-000000000002',
    interviewScheduled: '00000000-0000-4000-c000-000000000003',
    offerSent: '00000000-0000-4000-c000-000000000004',
    rejected: '00000000-0000-4000-c000-000000000005',
    e2eMagicLink: '00000000-0000-4000-c000-000000000006',
    e2eExpiredLink: '00000000-0000-4000-c000-000000000007',
  },
  jobs: {
    fullStack: '00000000-0000-4000-b000-000000000001',
    designer: '00000000-0000-4000-b000-000000000002',
    devOps: '00000000-0000-4000-b000-000000000003',
  },
  interviews: {
    screening: '00000000-0000-4000-d000-000000000001',
    technical: '00000000-0000-4000-d000-000000000002',
  },
} as const;

export const E2E_MAGIC_LINK_TOKENS = {
  valid: 'e2e-valid-magic-link-token-rove-hire-2026',
  expired: 'e2e-expired-magic-link-token-rove-hire-2026',
} as const;

export const HR_CREDENTIALS = {
  email: 'hr@rove.com',
  password: 'RoveHire2024!',
} as const;

export const SEED_CANDIDATE_NAMES = [
  'Alice Johnson',
  'Bob Martinez',
  'Carol Chen',
  'David Park',
  'Emma Wilson',
  'Frank E2E Applicant',
  'Grace Expired Link',
] as const;
