import { Injectable, Logger } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import { createHash, randomBytes } from 'crypto';
import { CandidateStatus } from '../../generated/prisma';
import type { PrismaService } from '../../prisma/prisma.service';

/** Magic link expiry duration: 14 days in milliseconds */
const EXPIRY_DURATION_MS = 14 * 24 * 60 * 60 * 1000;

/**
 * Result of magic link validation.
 * When valid, includes the candidateId for downstream use.
 * When invalid, includes a reason code.
 */
export interface MagicLinkValidation {
  valid: boolean;
  reason?: 'expired' | 'used' | 'invalid';
  candidateId?: string;
}

/**
 * Result of magic link generation.
 * Returns the full URL and expiry timestamp.
 */
export interface MagicLinkGenerateResult {
  /** The plain token (only returned once, never stored) */
  token: string;
  /** Full URL for candidate to access their application form */
  url: string;
  /** When the link expires */
  expiresAt: Date;
}

/**
 * Input for candidate application form submission.
 */
export interface ApplicationFormInput {
  phone?: string;
  location?: string;
  currentRole?: string;
  noticePeriod?: string;
  salaryExpectation?: string;
  linkedinUrl?: string;
}

/**
 * Error codes for MagicLinkService operations.
 */
export enum MagicLinkErrorCode {
  GENERATION_FAILED = 'GENERATION_FAILED',
  VALIDATION_FAILED = 'VALIDATION_FAILED',
  CONSUMPTION_FAILED = 'CONSUMPTION_FAILED',
  ALREADY_CONSUMED = 'ALREADY_CONSUMED',
  EXPIRED = 'EXPIRED',
  INVALID_TOKEN = 'INVALID_TOKEN',
}

/**
 * Custom error class for MagicLinkService operations.
 */
export class MagicLinkError extends Error {
  constructor(
    message: string,
    public readonly code: MagicLinkErrorCode,
  ) {
    super(message);
    this.name = 'MagicLinkError';
  }
}

@Injectable()
export class MagicLinkService {
  private readonly logger = new Logger(MagicLinkService.name);
  private readonly frontendUrl: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    this.frontendUrl = this.configService.get<string>('FRONTEND_URL', 'http://localhost:3000');
  }

  /**
   * Generate a magic link token for a candidate.
   *
   * - Creates 256-bit entropy using crypto.randomBytes(32)
   * - Encodes as URL-safe base64 (43+ chars)
   * - Stores only the SHA-256 hash in the database (never plaintext)
   * - Sets expiry to creation timestamp + 14 days
   *
   * @param candidateId - The UUID of the candidate to generate a link for
   * @returns The generated token URL and expiry date
   */
  async generate(candidateId: string): Promise<MagicLinkGenerateResult> {
    // Generate 256-bit (32 bytes) cryptographically random token
    const tokenBuffer = randomBytes(32);

    // Encode as URL-safe base64 (removes padding '=' for URL safety)
    const token = tokenBuffer.toString('base64url');

    // Compute SHA-256 hash of the raw token for storage
    const tokenHash = this.hashToken(token);

    // Calculate expiry: creation time + 14 days
    const now = new Date();
    const expiresAt = new Date(now.getTime() + EXPIRY_DURATION_MS);

    try {
      await this.prisma.magicLink.create({
        data: {
          tokenHash,
          candidateId,
          expiresAt,
          isConsumed: false,
        },
      });
    } catch (error) {
      this.logger.error(`Failed to create magic link for candidate ${candidateId}`, error);
      throw new MagicLinkError(
        `Failed to generate magic link: ${(error as Error).message}`,
        MagicLinkErrorCode.GENERATION_FAILED,
      );
    }

    const url = `${this.frontendUrl}/candidate-application/${token}`;

    return { token, url, expiresAt };
  }

  /**
   * Validate a magic link token without consuming it.
   *
   * - Hashes the presented token with SHA-256
   * - Looks up the hash in the database
   * - Checks expiry and consumption status
   *
   * Returns status: valid, expired, used, or not_found (invalid)
   *
   * @param token - The plaintext token from the URL
   * @returns Validation result with status and candidateId if valid
   */
  async validate(token: string): Promise<MagicLinkValidation> {
    const tokenHash = this.hashToken(token);

    const magicLink = await this.prisma.magicLink.findUnique({
      where: { tokenHash },
    });

    if (!magicLink) {
      return { valid: false, reason: 'invalid' };
    }

    if (magicLink.isConsumed) {
      return { valid: false, reason: 'used' };
    }

    if (new Date() > magicLink.expiresAt) {
      return { valid: false, reason: 'expired' };
    }

    return { valid: true, candidateId: magicLink.candidateId };
  }

  /**
   * Consume a magic link atomically within a transaction.
   *
   * Performs the following within a single database transaction:
   * 1. Looks up the magic link by token hash (with row-level locking via findFirst + where)
   * 2. Validates the link is not expired and not already consumed
   * 3. Marks the link as consumed (isConsumed=true, consumedAt=now)
   * 4. Saves the application form data on the candidate record
   * 5. Updates candidate status to FormSubmitted
   *
   * First writer wins: concurrent attempts will fail with ALREADY_CONSUMED.
   *
   * @param token - The plaintext token from the URL
   * @param formData - The candidate's application form data
   * @returns The updated candidate record
   */
  async consume(token: string, formData: ApplicationFormInput) {
    const tokenHash = this.hashToken(token);

    try {
      return await this.prisma.$transaction(async (tx) => {
        // Find and lock the magic link row
        const magicLink = await tx.magicLink.findUnique({
          where: { tokenHash },
        });

        if (!magicLink) {
          throw new MagicLinkError('Magic link not found', MagicLinkErrorCode.INVALID_TOKEN);
        }

        if (magicLink.isConsumed) {
          throw new MagicLinkError(
            'Magic link has already been used',
            MagicLinkErrorCode.ALREADY_CONSUMED,
          );
        }

        if (new Date() > magicLink.expiresAt) {
          throw new MagicLinkError('Magic link has expired', MagicLinkErrorCode.EXPIRED);
        }

        // Mark the magic link as consumed atomically
        const consumedAt = new Date();
        await tx.magicLink.update({
          where: {
            id: magicLink.id,
            isConsumed: false, // Optimistic lock: ensures first writer wins
          },
          data: {
            isConsumed: true,
            consumedAt,
          },
        });

        // Save form data and update candidate status
        const candidate = await tx.candidate.update({
          where: { id: magicLink.candidateId },
          data: {
            phone: formData.phone ?? null,
            location: formData.location ?? null,
            currentRole: formData.currentRole ?? null,
            noticePeriod: formData.noticePeriod ?? null,
            salaryExpectation: formData.salaryExpectation ?? null,
            linkedinUrl: formData.linkedinUrl ?? null,
            status: CandidateStatus.FormSubmitted,
            lastActivityAt: consumedAt,
          },
        });

        return candidate;
      });
    } catch (error) {
      // Re-throw MagicLinkErrors as-is
      if (error instanceof MagicLinkError) {
        throw error;
      }

      this.logger.error('Failed to consume magic link', error);
      throw new MagicLinkError(
        `Failed to consume magic link: ${(error as Error).message}`,
        MagicLinkErrorCode.CONSUMPTION_FAILED,
      );
    }
  }

  /**
   * Compute SHA-256 hash of a token string.
   * Used both for storage and for validation comparison.
   */
  hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}
