import { InputType, Field } from '@nestjs/graphql';
import { IsString, MinLength, MaxLength, IsEnum } from 'class-validator';
import { RecommendationGql } from '../interview.model';

/**
 * Input DTO for recording interview feedback.
 * Validation:
 * - interviewId: required UUID
 * - recommendation: Hire, NoHire, or Maybe
 * - feedback: required, 1-2000 characters
 *
 * Requirements: 6.4, 6.5
 */
@InputType()
export class RecordFeedbackInput {
  @Field(() => String, { description: 'ID of the interview' })
  @IsString()
  interviewId!: string;

  @Field(() => RecommendationGql, { description: 'Recommendation (Hire, NoHire, or Maybe)' })
  @IsEnum(RecommendationGql, { message: 'Recommendation must be Hire, NoHire, or Maybe' })
  recommendation!: RecommendationGql;

  @Field(() => String, { description: 'Feedback notes (1-2000 characters)' })
  @IsString()
  @MinLength(1, { message: 'Feedback is required' })
  @MaxLength(2000, { message: 'Feedback must not exceed 2000 characters' })
  feedback!: string;
}
