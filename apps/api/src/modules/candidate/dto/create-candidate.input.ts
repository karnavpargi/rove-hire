import { InputType, Field } from '@nestjs/graphql';
import { IsString, IsUUID, IsEmail, MaxLength, MinLength } from 'class-validator';

/**
 * Input DTO for creating a new candidate.
 * Validates:
 * - name: required, max 100 characters
 * - email: required, RFC 5322 format, max 254 characters
 * - jobOpeningId: required, valid UUID v4
 *
 * Resume file is handled separately via file upload.
 *
 * Requirements: 4.1, 4.5, 4.7, 4.8
 */
@InputType()
export class CreateCandidateInput {
  @Field(() => String, { description: 'Candidate full name (max 100 chars)' })
  @IsString()
  @MinLength(1, { message: 'Candidate name is required' })
  @MaxLength(100, { message: 'Candidate name must not exceed 100 characters' })
  name!: string;

  @Field(() => String, { description: 'Candidate email (RFC 5322, max 254 chars)' })
  @IsString()
  @IsEmail({}, { message: 'Email must be a valid email address' })
  @MaxLength(254, { message: 'Email must not exceed 254 characters' })
  email!: string;

  @Field(() => String, { description: 'Job opening ID to associate with' })
  @IsString()
  @IsUUID('4', { message: 'Invalid job opening ID format' })
  jobOpeningId!: string;
}
