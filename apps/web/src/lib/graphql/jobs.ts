/**
 * GraphQL queries and mutations for Job Openings.
 *
 * Provides:
 * - jobOpenings: list all jobs with candidate count, ordered by createdAt DESC
 * - jobOpening: single job detail with associated candidates
 * - createJobOpening: create a new job opening
 * - updateJobOpening: update title, description, skills, and status
 * - updateJobOpeningStatus: toggle Open/Closed status
 *
 * Validates: Requirements 3.1, 3.2, 3.3, 3.5, 3.7, 3.9, 3.10
 */

import { gql } from 'graphql-request';

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

/** Fetch all job openings with candidate count, most recent first */
export const JOB_OPENINGS_QUERY = gql`
  query JobOpenings {
    jobOpenings {
      id
      title
      description
      skills {
        id
        tag
      }
      status
      candidateCount
      createdAt
      updatedAt
    }
  }
`;

/** Fetch a single job opening with associated candidates */
export const JOB_OPENING_QUERY = gql`
  query JobOpening($id: String!) {
    jobOpening(id: $id) {
      id
      title
      description
      skills {
        id
        tag
      }
      status
      candidateCount
      createdAt
      updatedAt
      candidates {
        id
        name
        email
        status
        currentRole
        lastActivityAt
        createdAt
      }
    }
  }
`;

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

/** Create a new job opening */
export const CREATE_JOB_OPENING_MUTATION = gql`
  mutation CreateJobOpening($input: CreateJobOpeningInput!) {
    createJobOpening(input: $input) {
      id
      title
      description
      skills {
        id
        tag
      }
      status
      candidateCount
      createdAt
      updatedAt
    }
  }
`;

/** Update a full job opening (title, description, skills, status) */
export const UPDATE_JOB_OPENING_MUTATION = gql`
  mutation UpdateJobOpening($input: UpdateJobOpeningInput!) {
    updateJobOpening(input: $input) {
      id
      title
      description
      skills { id tag }
      status
      candidateCount
      createdAt
      updatedAt
    }
  }
`;

/** Update a job opening's status (Open <-> Closed) */
export const UPDATE_JOB_OPENING_STATUS_MUTATION = gql`
  mutation UpdateJobOpeningStatus($input: UpdateJobOpeningStatusInput!) {
    updateJobOpeningStatus(input: $input) {
      id
      status
      updatedAt
    }
  }
`;
