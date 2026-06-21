import { InputType, Field } from '@nestjs/graphql';
import { IsString, IsOptional, IsEnum } from 'class-validator';
import { CandidateStatusGql } from '../candidate.model';

/**
 * Input DTO for updating a candidate's pipeline status.
 * Delegates to StateMachineService for transition validation.
 *
 * - candidateId: UUID of the candidate
 * - targetStatus: desired new status
 * - rejectionReason: required when transitioning to Rejected (5-500 chars)
 *
 * Requirements: 10.1, 10.3, 10.6
 */
@InputType()
export class UpdateCandidateStatusInput {
  @Field(() => String, { description: 'Candidate ID' })
  @IsString()
  candidateId!: string;

  @Field(() => CandidateStatusGql, { description: 'Target pipeline status' })
  @IsEnum(CandidateStatusGql, { message: 'Invalid target status' })
  targetStatus!: string;

  @Field(() => String, {
    nullable: true,
    description: 'Reason for rejection (5-500 chars, required for Rejected)',
  })
  @IsOptional()
  @IsString()
  rejectionReason?: string;
}
