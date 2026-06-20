import { InputType, Field } from '@nestjs/graphql';

/**
 * GraphQL input type for candidate application form submission.
 * All fields match the public Application_Form presented via magic link.
 *
 * Validation is handled at the service layer using shared Zod schemas.
 *
 * Requirements: 5.1, 5.7, 5.8
 */
@InputType('SubmitApplicationInput')
export class SubmitApplicationInput {
  @Field(() => String, { description: 'Phone number (max 20 chars, digits/spaces/hyphens/parens/leading +)' })
  phone!: string;

  @Field(() => String, { description: 'Current location (max 100 chars)' })
  location!: string;

  @Field(() => String, { description: 'Current role (max 100 chars)' })
  currentRole!: string;

  @Field(() => String, { description: 'Notice period (max 50 chars)' })
  noticePeriod!: string;

  @Field(() => String, { description: 'Salary expectation (max 50 chars)' })
  salaryExpectation!: string;

  @Field(() => String, { nullable: true, description: 'LinkedIn URL (optional, max 255 chars, must start with https://linkedin.com/ or https://www.linkedin.com/)' })
  linkedinUrl?: string;
}
