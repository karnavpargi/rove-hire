import { ObjectType, Field, registerEnumType } from '@nestjs/graphql';

/**
 * GraphQL enum for timeline event types.
 * Matches the TimelineEventType shared enum.
 *
 * Requirements: 7.2, 9.5, 10.4
 */
export enum TimelineEventTypeGql {
  StatusChange = 'status_change',
  InterviewScheduled = 'interview_scheduled',
  FeedbackSubmitted = 'feedback_submitted',
  OfferGenerated = 'offer_generated',
  RejectionRecorded = 'rejection_recorded',
  ApplicationSubmitted = 'application_submitted',
}

registerEnumType(TimelineEventTypeGql, {
  name: 'TimelineEventType',
  description: 'Type of timeline event recorded for a candidate',
});

/**
 * GraphQL object type for a Timeline Event.
 * Represents a chronological entry in a candidate's activity history.
 *
 * Requirements: 7.2, 9.5, 10.4
 */
@ObjectType('TimelineEvent')
export class TimelineEventType {
  @Field(() => String, { description: 'Unique identifier for the event' })
  id!: string;

  @Field(() => String, { description: 'Candidate ID this event belongs to' })
  candidateId!: string;

  @Field(() => String, { description: 'Type of event (status_change, interview_scheduled, etc.)' })
  eventType!: string;

  @Field(() => String, {
    nullable: true,
    description: 'Previous candidate status (for status change events)',
  })
  previousStatus?: string | null;

  @Field(() => String, {
    nullable: true,
    description: 'New candidate status (for status change events)',
  })
  newStatus?: string | null;

  @Field(() => String, {
    nullable: true,
    description: 'Additional details about the event (max 2000 chars)',
  })
  details?: string | null;

  @Field(() => String, {
    nullable: true,
    description: 'ID of the HR user who performed the action',
  })
  actorId?: string | null;

  @Field(() => Date, { description: 'Timestamp when the event occurred' })
  createdAt!: Date;
}
