/**
 * GraphQL queries and mutations for Candidates.
 *
 * Provides:
 * - createCandidate: create a new candidate with resume upload and magic link generation
 *
 * Validates: Requirements 4.1, 4.5, 4.7, 4.8, 4.9, 4.10
 */

import { gql } from 'graphql-request';

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

/** Create a new candidate with resume file (base64 encoded) */
export const CREATE_CANDIDATE_MUTATION = gql`
  mutation CreateCandidate($input: CreateCandidateInput!, $resumeBase64: String!, $resumeFilename: String!) {
    createCandidate(input: $input, resumeBase64: $resumeBase64, resumeFilename: $resumeFilename) {
      candidate {
        id
        name
        email
        status
        createdAt
      }
      magicLinkUrl
    }
  }
`;
