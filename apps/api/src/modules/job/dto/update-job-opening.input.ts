import { InputType, Field } from '@nestjs/graphql';
import {
  IsString,
  MinLength,
  MaxLength,
  IsArray,
  ArrayMinSize,
  ArrayMaxSize,
  IsOptional,
  IsUUID,
  IsEnum,
} from 'class-validator';
import { JobOpeningStatusGql } from '../job.model';

@InputType()
export class UpdateJobOpeningInput {
  @Field(() => String, { description: 'Job opening ID' })
  @IsString()
  @IsUUID('4', { message: 'Invalid job opening ID format' })
  id!: string;

  @Field(() => String, { nullable: true, description: 'Job title (1-200 characters)' })
  @IsOptional()
  @IsString()
  @MinLength(1, { message: 'Job title is required' })
  @MaxLength(200, { message: 'Job title must not exceed 200 characters' })
  title?: string;

  @Field(() => String, { nullable: true, description: 'Job description (max 5000 characters)' })
  @IsOptional()
  @IsString()
  @MaxLength(5000, { message: 'Description must not exceed 5000 characters' })
  description?: string | null;

  @Field(() => [String], {
    nullable: true,
    description: 'Skill tags (1-20 tags, each max 50 chars)',
  })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1, { message: 'At least 1 skill tag is required' })
  @ArrayMaxSize(20, { message: 'Must not exceed 20 skill tags' })
  @IsString({ each: true })
  @MaxLength(50, { each: true, message: 'Each skill tag must not exceed 50 characters' })
  skills?: string[];

  @Field(() => JobOpeningStatusGql, { nullable: true, description: 'New status (Open or Closed)' })
  @IsOptional()
  @IsEnum(JobOpeningStatusGql, { message: 'Status must be Open or Closed' })
  status?: 'Open' | 'Closed';
}
