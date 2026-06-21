import { InputType, Field } from '@nestjs/graphql';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

/**
 * GraphQL input type for candidate application form submission.
 * All fields match the public Application_Form presented via magic link.
 *
 * Validation is also enforced at the service layer using shared Zod schemas.
 *
 * Requirements: 5.1, 5.7, 5.8
 */
@InputType('SubmitApplicationInput')
export class SubmitApplicationInput {
  @Field(() => String, {
    description: 'Phone number (max 20 chars, digits/spaces/hyphens/parens/leading +)',
  })
  @IsString()
  @MinLength(7)
  @MaxLength(20)
  phone!: string;

  @Field(() => String, { description: 'Current location (max 100 chars)' })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  location!: string;

  @Field(() => String, { description: 'Current role (max 100 chars)' })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  currentRole!: string;

  @Field(() => String, { description: 'Notice period (max 50 chars)' })
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  noticePeriod!: string;

  @Field(() => String, { description: 'Salary expectation (max 50 chars)' })
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  salaryExpectation!: string;

  @Field(() => String, {
    nullable: true,
    description:
      'LinkedIn URL (optional, max 255 chars, must start with https://linkedin.com/ or https://www.linkedin.com/)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  linkedinUrl?: string;
}
