import { InputType, Field, Int } from '@nestjs/graphql';
import { IsOptional, IsArray, IsString, MinLength, MaxLength, IsInt, Min } from 'class-validator';
import { CandidateStatusGql } from '../candidate.model';

/**
 * Input DTO for filtering and paginating candidates.
 *
 * - page: 1-based page number (default 1)
 * - pageSize: items per page (default 20)
 * - statuses: optional array of status filters (multi-select)
 * - search: optional text search on name/role (min 2 chars, case-insensitive ILIKE)
 * - jobOpeningId: optional filter by job
 *
 * Requirements: 2.1, 2.2, 2.3, 2.6
 */
@InputType()
export class CandidateFiltersInput {
  @Field(() => Int, { nullable: true, defaultValue: 1, description: 'Page number (1-based)' })
  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number;

  @Field(() => Int, { nullable: true, defaultValue: 20, description: 'Items per page (default 20)' })
  @IsOptional()
  @IsInt()
  @Min(1)
  pageSize?: number;

  @Field(() => [CandidateStatusGql], { nullable: true, description: 'Filter by status (multi-select)' })
  @IsOptional()
  @IsArray()
  statuses?: string[];

  @Field(() => String, { nullable: true, description: 'Search by name or role (min 2 chars, case-insensitive)' })
  @IsOptional()
  @IsString()
  @MinLength(2, { message: 'Search query must be at least 2 characters' })
  @MaxLength(100, { message: 'Search query must not exceed 100 characters' })
  search?: string;

  @Field(() => String, { nullable: true, description: 'Filter by job opening ID' })
  @IsOptional()
  @IsString()
  jobOpeningId?: string;
}
