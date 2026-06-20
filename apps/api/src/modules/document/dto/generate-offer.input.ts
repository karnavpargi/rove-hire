import { InputType, Field, Float } from '@nestjs/graphql';

/**
 * GraphQL input type for generating offer documents (offer letter + NDA).
 */
@InputType()
export class GenerateOfferInput {
  @Field(() => String, { description: 'Candidate ID to generate offer for' })
  candidateId!: string;

  @Field(() => String, { description: 'Role title for the offer (max 200 chars)' })
  roleTitle!: string;

  @Field(() => String, { description: 'Salary currency (USD, EUR, GBP, INR, AED)' })
  salaryCurrency!: string;

  @Field(() => Float, { description: 'Salary amount (0.01–9,999,999.99, max 2 decimals)' })
  salaryAmount!: number;

  @Field(() => String, { description: 'Start date in ISO format (must be >= today)' })
  startDate!: string;

  @Field(() => String, { description: 'Reporting manager name (max 100 chars)' })
  reportingManager!: string;

  @Field(() => String, { description: 'Work location (max 200 chars)' })
  location!: string;
}
