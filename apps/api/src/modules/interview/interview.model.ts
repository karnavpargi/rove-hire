import { ObjectType, Field, registerEnumType } from '@nestjs/graphql';

/**
 * GraphQL enums for Interview module.
 * Match Prisma enums exactly.
 *
 * Requirements: 6.1, 6.3, 6.4
 */
export enum InterviewTypeGql {
  Screening = 'Screening',
  Technical = 'Technical',
}

export enum InterviewStatusGql {
  Scheduled = 'Scheduled',
  Completed = 'Completed',
  Cancelled = 'Cancelled',
}

export enum RecommendationGql {
  Hire = 'Hire',
  NoHire = 'NoHire',
  Maybe = 'Maybe',
}

registerEnumType(InterviewTypeGql, {
  name: 'InterviewType',
  description: 'Type of interview (Screening or Technical)',
});

registerEnumType(InterviewStatusGql, {
  name: 'InterviewStatus',
  description: 'Status of the interview (Scheduled, Completed, or Cancelled)',
});

registerEnumType(RecommendationGql, {
  name: 'Recommendation',
  description: 'Interview recommendation (Hire, NoHire, or Maybe)',
});

/**
 * GraphQL object type for a candidate summary (nested in Interview).
 */
@ObjectType('InterviewCandidate')
export class InterviewCandidateType {
  @Field(() => String)
  id!: string;

  @Field(() => String)
  name!: string;
}

/**
 * GraphQL object type for an Interview.
 *
 * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5
 */
@ObjectType('Interview')
export class InterviewObjectType {
  @Field(() => String)
  id!: string;

  @Field(() => String, { description: 'ID of the associated candidate' })
  candidateId!: string;

  @Field(() => InterviewCandidateType, { nullable: true, description: 'Associated candidate info' })
  candidate?: InterviewCandidateType | null;

  @Field(() => InterviewTypeGql, { description: 'Type of interview (Screening or Technical)' })
  type!: InterviewTypeGql;

  @Field(() => Date, { description: 'Scheduled date and time for the interview' })
  scheduledAt!: Date;

  @Field(() => String, { description: 'Name of the interviewer (1-100 chars)' })
  interviewerName!: string;

  @Field(() => String, { nullable: true, description: 'Interview scheduling notes (max 1000 chars)' })
  notes?: string | null;

  @Field(() => InterviewStatusGql, { description: 'Current status of the interview' })
  status!: InterviewStatusGql;

  @Field(() => RecommendationGql, { nullable: true, description: 'Recommendation after completion' })
  recommendation?: RecommendationGql | null;

  @Field(() => String, { nullable: true, description: 'Feedback text after completion (1-2000 chars)' })
  feedback?: string | null;

  @Field(() => Date, { nullable: true, description: 'Date when the interview was completed' })
  completedAt?: Date | null;

  @Field(() => Date)
  createdAt!: Date;

  @Field(() => Date)
  updatedAt!: Date;
}
