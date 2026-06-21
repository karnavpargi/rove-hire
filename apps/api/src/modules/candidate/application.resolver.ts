import { BadRequestException, Inject } from '@nestjs/common';
import { Args, Field, Mutation, ObjectType, Query, Resolver } from '@nestjs/graphql';
import { optionalLinkedinUrlSchema, phoneSchema } from '@rove-hire/shared';
import { Public } from '../../common/decorators';
import {
  MagicLinkError,
  MagicLinkErrorCode,
  MagicLinkService,
} from '../magic-link/magic-link.service';
import { CandidateType } from './candidate.model';
import { SubmitApplicationInput } from './dto/submit-application.input';

/**
 * GraphQL type returned by validateMagicLink query.
 * Tells the frontend whether the token is valid or why it's not.
 */
@ObjectType('MagicLinkValidation')
export class MagicLinkValidationType {
  @Field(() => Boolean, { description: 'Whether the magic link is valid and can be used' })
  valid!: boolean;

  @Field(() => String, {
    nullable: true,
    description: 'Reason for invalidity: expired | used | invalid',
  })
  reason?: string;

  @Field(() => String, { nullable: true, description: 'Candidate ID (only when valid)' })
  candidateId?: string;
}

/**
 * Validate application form fields against the spec constraints.
 *
 * Field constraints:
 * - phone: only digits, spaces, hyphens, parentheses, leading plus; 7-20 chars (Req 5.7)
 * - location: non-empty, max 100 chars
 * - currentRole: non-empty, max 100 chars
 * - noticePeriod: non-empty, max 50 chars
 * - salaryExpectation: non-empty, max 50 chars
 * - linkedinUrl: optional, valid format (https://linkedin.com/ or https://www.linkedin.com/), max 255 chars (Req 5.8)
 */
function validateApplicationForm(input: SubmitApplicationInput): string[] {
  const errors: string[] = [];

  // Phone validation using shared schema (Req 5.7)
  const phoneResult = phoneSchema.safeParse(input.phone);
  if (!phoneResult.success) {
    errors.push(`phone: ${phoneResult.error.issues[0].message}`);
  }

  // Location validation: non-empty, max 100 chars
  if (!input.location || input.location.trim().length === 0) {
    errors.push('location: Location is required');
  } else if (input.location.length > 100) {
    errors.push('location: Location must not exceed 100 characters');
  }

  // Current role validation: non-empty, max 100 chars
  if (!input.currentRole || input.currentRole.trim().length === 0) {
    errors.push('currentRole: Current role is required');
  } else if (input.currentRole.length > 100) {
    errors.push('currentRole: Current role must not exceed 100 characters');
  }

  // Notice period validation: non-empty, max 50 chars
  if (!input.noticePeriod || input.noticePeriod.trim().length === 0) {
    errors.push('noticePeriod: Notice period is required');
  } else if (input.noticePeriod.length > 50) {
    errors.push('noticePeriod: Notice period must not exceed 50 characters');
  }

  // Salary expectation validation: non-empty, max 50 chars
  if (!input.salaryExpectation || input.salaryExpectation.trim().length === 0) {
    errors.push('salaryExpectation: Salary expectation is required');
  } else if (input.salaryExpectation.length > 50) {
    errors.push('salaryExpectation: Salary expectation must not exceed 50 characters');
  }

  // LinkedIn URL validation: optional, but if provided must be valid format (Req 5.8)
  if (input.linkedinUrl && input.linkedinUrl.trim().length > 0) {
    const linkedinResult = optionalLinkedinUrlSchema.safeParse(input.linkedinUrl);
    if (!linkedinResult.success) {
      errors.push(`linkedinUrl: ${linkedinResult.error.issues[0].message}`);
    }
  }

  return errors;
}

/**
 * ApplicationResolver handles public (unauthenticated) candidate application endpoints.
 *
 * Both resolvers are decorated with @Public() to bypass the global JwtAuthGuard.
 * Authentication is done solely via the magic link token.
 *
 * Queries:
 * - validateMagicLink(token): check if a magic link is valid/expired/used
 *
 * Mutations:
 * - submitApplication(token, input): validate and submit candidate application form
 *
 * Requirements: 5.1, 5.2, 5.7, 5.8, 5.9, 20.5, 26.2
 */
@Resolver()
export class ApplicationResolver {
  constructor(@Inject(MagicLinkService) private readonly magicLinkService: MagicLinkService) {}

  /**
   * Validate a magic link token without consuming it.
   * Returns validity status and reason if invalid.
   *
   * Used by the frontend to determine which screen to show:
   * - valid: show application form
   * - expired: show "link expired" screen
   * - used: show "link already used" screen
   * - invalid: show "link invalid" screen
   *
   * Requirements: 5.4, 5.5, 5.6
   */
  @Public()
  @Query(() => MagicLinkValidationType, { description: 'Validate a magic link token status' })
  async validateMagicLink(
    @Args('token', { description: 'The magic link token from the URL' }) token: string,
  ): Promise<MagicLinkValidationType> {
    const result = await this.magicLinkService.validate(token);
    return {
      valid: result.valid,
      reason: result.reason,
      candidateId: result.candidateId,
    };
  }

  /**
   * Submit a candidate application form via magic link.
   *
   * Flow:
   * 1. Validate all form fields using shared validators
   * 2. Call MagicLinkService.consume() which atomically:
   *    - Looks up token hash
   *    - Validates not expired, not consumed
   *    - Marks as consumed (first writer wins)
   *    - Saves form data on candidate record
   *    - Updates candidate status to FormSubmitted
   * 3. On concurrent submission, second caller gets "already used" error
   * 4. Original submission data is preserved unchanged on concurrent rejection
   *
   * Requirements: 5.1, 5.2, 5.7, 5.8, 5.9, 20.5, 26.2
   */
  @Public()
  @Mutation(() => CandidateType, {
    description: 'Submit candidate application form via magic link',
  })
  async submitApplication(
    @Args('token', { description: 'The magic link token from the URL' }) token: string,
    @Args('input', { type: () => SubmitApplicationInput }) input: SubmitApplicationInput,
  ): Promise<CandidateType> {
    // Step 1: Validate all form fields before consuming the magic link
    const validationErrors = validateApplicationForm(input);

    if (validationErrors.length > 0) {
      throw new BadRequestException({
        message: 'Validation failed',
        code: 'VALIDATION_ERROR',
        errors: validationErrors,
      });
    }

    // Step 2: Consume magic link atomically (saves form data + updates status)
    try {
      const candidate = await this.magicLinkService.consume(token, {
        phone: input.phone,
        location: input.location,
        currentRole: input.currentRole,
        noticePeriod: input.noticePeriod,
        salaryExpectation: input.salaryExpectation,
        linkedinUrl: input.linkedinUrl ?? undefined,
      });

      return {
        id: candidate.id,
        name: candidate.name,
        email: candidate.email,
        phone: candidate.phone,
        location: candidate.location,
        currentRole: candidate.currentRole,
        noticePeriod: candidate.noticePeriod,
        salaryExpectation: candidate.salaryExpectation,
        linkedinUrl: candidate.linkedinUrl,
        status: candidate.status,
        rejectionReason: candidate.rejectionReason,
        jobOpeningId: candidate.jobOpeningId,
        lastActivityAt: candidate.lastActivityAt,
        createdAt: candidate.createdAt,
        updatedAt: candidate.updatedAt,
        documents: [],
        interviews: [],
        timelineEvents: [],
      };
    } catch (error) {
      if (error instanceof MagicLinkError) {
        switch (error.code) {
          case MagicLinkErrorCode.ALREADY_CONSUMED:
            throw new BadRequestException({
              message: 'This link has already been used',
              code: 'ALREADY_USED',
            });
          case MagicLinkErrorCode.EXPIRED:
            throw new BadRequestException({
              message: 'This link has expired',
              code: 'LINK_EXPIRED',
            });
          case MagicLinkErrorCode.INVALID_TOKEN:
            throw new BadRequestException({
              message: 'Invalid magic link',
              code: 'INVALID_TOKEN',
            });
          default:
            throw new BadRequestException({
              message: 'Failed to submit application',
              code: 'SUBMISSION_FAILED',
            });
        }
      }
      throw error;
    }
  }
}
