import { InputType, Field } from '@nestjs/graphql';
import { IsOptional, IsString, IsEnum } from 'class-validator';
import { InterviewTypeGql, InterviewStatusGql } from '../interview.model';

/**
 * Input DTO for filtering interviews.
 * Filterable by candidateId, type, and status.
 * Results are always sorted by scheduledAt ascending.
 *
 * Requirements: 6.9
 */
@InputType()
export class InterviewFiltersInput {
  @Field(() => String, { nullable: true, description: 'Filter by candidate ID' })
  @IsOptional()
  @IsString()
  candidateId?: string;

  @Field(() => InterviewTypeGql, { nullable: true, description: 'Filter by interview type' })
  @IsOptional()
  @IsEnum(InterviewTypeGql)
  type?: InterviewTypeGql;

  @Field(() => InterviewStatusGql, { nullable: true, description: 'Filter by interview status' })
  @IsOptional()
  @IsEnum(InterviewStatusGql)
  status?: InterviewStatusGql;
}
