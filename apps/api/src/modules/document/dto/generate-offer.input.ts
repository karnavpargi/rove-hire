import { InputType, Field, Float } from '@nestjs/graphql';
import { IsString, IsNumber, Min, Max } from 'class-validator';

/**
 * GraphQL input type for generating offer documents (offer letter + NDA).
 */
@InputType()
export class GenerateOfferInput {
  @Field(() => String, { description: 'Candidate ID to generate offer for' })
  @IsString()
  candidateId!: string;

  @Field(() => String, { description: 'Role title for the offer (max 200 chars)' })
  @IsString()
  roleTitle!: string;

  @Field(() => String, { description: 'Salary currency (USD, EUR, GBP, INR, AED)' })
  @IsString()
  salaryCurrency!: string;

  @Field(() => Float, { description: 'Salary amount (0.01–9,999,999.99, max 2 decimals)' })
  @IsNumber()
  @Min(0.01)
  @Max(9_999_999.99)
  salaryAmount!: number;

  @Field(() => String, { description: 'Start date in ISO format (must be >= today)' })
  @IsString()
  startDate!: string;

  @Field(() => String, { description: 'Reporting manager name (max 100 chars)' })
  @IsString()
  reportingManager!: string;

  @Field(() => String, { description: 'Work location (max 200 chars)' })
  @IsString()
  location!: string;
}
