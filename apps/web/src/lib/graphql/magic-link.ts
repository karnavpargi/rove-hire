/**
 * GraphQL queries and mutations for magic link validation and application submission.
 *
 * These are PUBLIC operations (no auth required).
 *
 * Validates: Requirements 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.9
 */

import { gql } from 'graphql-request';

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

/** Validate a magic link token — returns validity status and reason if invalid */
export const VALIDATE_MAGIC_LINK_QUERY = gql`
  query ValidateMagicLink($token: String!) {
    validateMagicLink(token: $token) {
      valid
      reason
      candidateId
    }
  }
`;

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

/** Submit the candidate application form using the magic link token */
export const SUBMIT_APPLICATION_MUTATION = gql`
  mutation SubmitApplication($token: String!, $input: SubmitApplicationInput!) {
    submitApplication(token: $token, input: $input) {
      id
      name
      status
    }
  }
`;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface MagicLinkValidationResult {
  validateMagicLink: {
    valid: boolean;
    reason?: 'expired' | 'used' | 'invalid';
    candidateId?: string;
  };
}

export interface ApplicationFormInput {
  phone: string;
  location: string;
  currentRole: string;
  noticePeriod: string;
  salaryExpectation: string;
  linkedinUrl?: string;
}

export interface SubmitApplicationResult {
  submitApplication: {
    id: string;
    name: string;
    status: string;
  };
}
