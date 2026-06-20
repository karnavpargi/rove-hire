/**
 * GraphQL queries and mutations for Interviews.
 *
 * Provides:
 * - interviews: list all interviews sorted by scheduledAt ASC
 * - scheduleInterview: schedule a new interview for a candidate
 * - recordFeedback: record recommendation and feedback for an interview
 *
 * Validates: Requirements 6.1, 6.3, 6.4, 6.6, 6.7
 */

import { gql } from 'graphql-request';

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

/** Fetch all interviews with candidate info, sorted by scheduledAt ascending */
export const INTERVIEWS_QUERY = gql`
  query Interviews {
    interviews {
      id
      candidateId
      candidate {
        id
        name
      }
      type
      scheduledAt
      interviewerName
      notes
      status
      recommendation
      feedback
      completedAt
      createdAt
      updatedAt
    }
  }
`;

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

/** Schedule a new interview */
export const SCHEDULE_INTERVIEW_MUTATION = gql`
  mutation ScheduleInterview($input: ScheduleInterviewInput!) {
    scheduleInterview(input: $input) {
      id
      candidateId
      candidate {
        id
        name
      }
      type
      scheduledAt
      interviewerName
      notes
      status
      createdAt
      updatedAt
    }
  }
`;

/** Record feedback for an interview */
export const RECORD_FEEDBACK_MUTATION = gql`
  mutation RecordFeedback($input: RecordFeedbackInput!) {
    recordFeedback(input: $input) {
      id
      status
      recommendation
      feedback
      completedAt
      updatedAt
    }
  }
`;
