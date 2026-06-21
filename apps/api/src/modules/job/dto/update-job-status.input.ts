import { InputType, Field } from '@nestjs/graphql';
import { IsString, IsUUID, IsEnum } from 'class-validator';
import { JobOpeningStatusGql } from '../job.model';

/**
 * Input DTO for updating a job opening's status.
 * Status is restricted to Open or Closed values.
 *
 * Requirements: 3.3, 3.5
 */
@InputType()
export class UpdateJobOpeningStatusInput {
  @Field(() => String, { description: 'Job opening ID' })
  @IsString()
  @IsUUID('4', { message: 'Invalid job opening ID format' })
  id!: string;

  @Field(() => JobOpeningStatusGql, { description: 'New status (Open or Closed)' })
  @IsEnum(JobOpeningStatusGql, { message: 'Status must be Open or Closed' })
  status!: 'Open' | 'Closed';
}
