import { InputType, Field } from '@nestjs/graphql';
import { IsString, MinLength, MaxLength, IsArray, ArrayMinSize, ArrayMaxSize, IsOptional } from 'class-validator';

/**
 * Input DTO for creating a new job opening.
 * Validation:
 * - title: required, 1-200 characters
 * - description: optional, max 5000 characters
 * - skills: required, 1-20 tags, each max 50 characters
 *
 * Requirements: 3.1, 3.6, 3.7, 3.8, 3.9
 */
@InputType()
export class CreateJobOpeningInput {
  @Field(() => String, { description: 'Job title (1-200 characters)' })
  @IsString()
  @MinLength(1, { message: 'Job title is required' })
  @MaxLength(200, { message: 'Job title must not exceed 200 characters' })
  title!: string;

  @Field(() => String, { nullable: true, description: 'Job description (max 5000 characters)' })
  @IsOptional()
  @IsString()
  @MaxLength(5000, { message: 'Description must not exceed 5000 characters' })
  description?: string | null;

  @Field(() => [String], { description: 'Skill tags (1-20 tags, each max 50 chars)' })
  @IsArray()
  @ArrayMinSize(1, { message: 'At least 1 skill tag is required' })
  @ArrayMaxSize(20, { message: 'Must not exceed 20 skill tags' })
  @IsString({ each: true })
  @MaxLength(50, { each: true, message: 'Each skill tag must not exceed 50 characters' })
  skills!: string[];
}
