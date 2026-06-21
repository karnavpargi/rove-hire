import { InputType, Field } from '@nestjs/graphql';
import { IsString, MinLength, MaxLength, IsOptional, IsDateString, IsEnum } from 'class-validator';
import { InterviewTypeGql } from '../interview.model';

/**
 * Input DTO for scheduling a new interview.
 * Validation:
 * - candidateId: required UUID
 * - type: Screening or Technical
 * - scheduledAt: ISO 8601 date string, must be in the future (validated in service)
 * - interviewerName: required, 1-100 characters
 * - notes: optional, max 1000 characters
 *
 * Requirements: 6.1, 6.3, 6.6, 6.7
 */
@InputType()
export class ScheduleInterviewInput {
  @Field(() => String, { description: 'ID of the candidate to interview' })
  @IsString()
  candidateId!: string;

  @Field(() => InterviewTypeGql, { description: 'Type of interview (Screening or Technical)' })
  @IsEnum(InterviewTypeGql, { message: 'Interview type must be Screening or Technical' })
  type!: InterviewTypeGql;

  @Field(() => String, {
    description: 'Scheduled date/time in ISO 8601 format (must be in the future)',
  })
  @IsDateString({}, { message: 'Scheduled date must be a valid ISO 8601 date string' })
  scheduledAt!: string;

  @Field(() => String, { description: 'Name of the interviewer (1-100 characters)' })
  @IsString()
  @MinLength(1, { message: 'Interviewer name is required' })
  @MaxLength(100, { message: 'Interviewer name must not exceed 100 characters' })
  interviewerName!: string;

  @Field(() => String, { nullable: true, description: 'Interview notes (max 1000 characters)' })
  @IsOptional()
  @IsString()
  @MaxLength(1000, { message: 'Interview notes must not exceed 1000 characters' })
  notes?: string | null;
}
