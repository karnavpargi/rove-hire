import { ObjectType, Field, Int, registerEnumType } from '@nestjs/graphql';

/**
 * GraphQL enum for Job Opening status.
 * Matches Prisma's JobOpeningStatus enum.
 *
 * Requirements: 3.3, 3.5
 */
export enum JobOpeningStatusGql {
  Open = 'Open',
  Closed = 'Closed',
}

registerEnumType(JobOpeningStatusGql, {
  name: 'JobOpeningStatus',
  description: 'Status of a job opening (Open or Closed)',
});

/**
 * GraphQL object type for a skill tag associated with a job opening.
 */
@ObjectType()
export class JobOpeningSkillType {
  @Field(() => String)
  id!: string;

  @Field(() => String)
  tag!: string;
}

/**
 * GraphQL object type for a candidate summary (nested in JobOpening detail).
 */
@ObjectType('JobOpeningCandidate')
export class JobOpeningCandidateType {
  @Field(() => String)
  id!: string;

  @Field(() => String)
  name!: string;

  @Field(() => String)
  email!: string;

  @Field(() => String)
  status!: string;

  @Field(() => String, { nullable: true })
  currentRole?: string | null;

  @Field(() => Date)
  lastActivityAt!: Date;

  @Field(() => Date)
  createdAt!: Date;
}

/**
 * GraphQL object type for a Job Opening.
 * Includes candidateCount for list views.
 *
 * Requirements: 3.1, 3.2, 3.10
 */
@ObjectType('JobOpening')
export class JobOpeningType {
  @Field(() => String)
  id!: string;

  @Field(() => String, { description: 'Job title (max 200 chars)' })
  title!: string;

  @Field(() => String, { nullable: true, description: 'Job description (max 5000 chars)' })
  description?: string | null;

  @Field(() => JobOpeningStatusGql, { description: 'Current status (Open or Closed)' })
  status!: 'Open' | 'Closed';

  @Field(() => [JobOpeningSkillType], { description: 'Associated skill tags' })
  skills!: JobOpeningSkillType[];

  @Field(() => Int, { description: 'Number of candidates associated with this job' })
  candidateCount!: number;

  @Field(() => [JobOpeningCandidateType], {
    nullable: true,
    description: 'Associated candidates (only on detail view)',
  })
  candidates?: JobOpeningCandidateType[] | null;

  @Field(() => Date)
  createdAt!: Date;

  @Field(() => Date)
  updatedAt!: Date;
}
