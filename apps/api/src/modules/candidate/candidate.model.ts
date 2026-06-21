import { ObjectType, Field, Int, registerEnumType } from '@nestjs/graphql';
import { TimelineEventType } from '../timeline/timeline.model';
import { InterviewObjectType } from '../interview/interview.model';
import { DocumentModel } from '../document/dto/document.model';

/**
 * GraphQL enum for Candidate pipeline status.
 * Matches Prisma's CandidateStatus enum.
 *
 * Requirements: 10.1, 10.2
 */
export enum CandidateStatusGql {
  Applied = 'Applied',
  FormSubmitted = 'FormSubmitted',
  InterviewScheduled = 'InterviewScheduled',
  OfferSent = 'OfferSent',
  Hired = 'Hired',
  Rejected = 'Rejected',
}

registerEnumType(CandidateStatusGql, {
  name: 'CandidateStatus',
  description: 'Pipeline status of a candidate',
});

/**
 * GraphQL object type for a Candidate.
 *
 * Requirements: 4.1, 4.5, 7.1
 */
@ObjectType('Candidate')
export class CandidateType {
  @Field(() => String)
  id!: string;

  @Field(() => String, { description: 'Candidate full name (max 100 chars)' })
  name!: string;

  @Field(() => String, { description: 'Candidate email (RFC 5322)' })
  email!: string;

  @Field(() => String, { nullable: true, description: 'Phone number (max 20 chars)' })
  phone?: string | null;

  @Field(() => String, { nullable: true, description: 'Location (max 100 chars)' })
  location?: string | null;

  @Field(() => String, { nullable: true, description: 'Current role (max 100 chars)' })
  currentRole?: string | null;

  @Field(() => String, { nullable: true, description: 'Notice period (max 50 chars)' })
  noticePeriod?: string | null;

  @Field(() => String, { nullable: true, description: 'Salary expectation (max 50 chars)' })
  salaryExpectation?: string | null;

  @Field(() => String, { nullable: true, description: 'LinkedIn URL (max 255 chars)' })
  linkedinUrl?: string | null;

  @Field(() => CandidateStatusGql, { description: 'Current pipeline status' })
  status!: string;

  @Field(() => String, { nullable: true, description: 'Reason for rejection (5-500 chars)' })
  rejectionReason?: string | null;

  @Field(() => String, { description: 'Associated job opening ID' })
  jobOpeningId!: string;

  @Field(() => Date, { description: 'Last activity timestamp (used for sorting)' })
  lastActivityAt!: Date;

  @Field(() => Date)
  createdAt!: Date;

  @Field(() => Date)
  updatedAt!: Date;

  @Field(() => [DocumentModel], { description: 'Candidate documents (resume, offer letter, NDA)' })
  documents!: DocumentModel[];

  @Field(() => [InterviewObjectType], { description: 'Candidate interviews' })
  interviews!: InterviewObjectType[];

  @Field(() => [TimelineEventType], { description: 'Candidate timeline events' })
  timelineEvents!: TimelineEventType[];
}

/**
 * Result type for createCandidate mutation — includes magic link URL.
 */
@ObjectType('CreateCandidateResult')
export class CreateCandidateResultType {
  @Field(() => CandidateType, { description: 'The created candidate' })
  candidate!: CandidateType;

  @Field(() => String, { description: 'Magic link URL for candidate application form' })
  magicLinkUrl!: string;
}

/**
 * Paginated candidates result type.
 */
@ObjectType('PaginatedCandidates')
export class PaginatedCandidatesType {
  @Field(() => [CandidateType], { description: 'List of candidates' })
  items!: CandidateType[];

  @Field(() => Int, { description: 'Total number of matching candidates' })
  total!: number;

  @Field(() => Int, { description: 'Current page number' })
  page!: number;

  @Field(() => Int, { description: 'Page size' })
  pageSize!: number;

  @Field(() => Int, { description: 'Total number of pages' })
  totalPages!: number;

  @Field(() => Boolean, { description: 'Whether a next page exists' })
  hasNextPage!: boolean;

  @Field(() => Boolean, { description: 'Whether a previous page exists' })
  hasPreviousPage!: boolean;
}
