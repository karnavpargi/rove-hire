/**
 * Property 8: Magic Link — Time-Based Expiry
 *
 * Property-based tests verifying that magic link validation correctly
 * rejects tokens when current time exceeds creation + 14 days, and
 * accepts tokens when current time is within the 14-day window
 * (assuming token is not consumed).
 *
 * **Validates: Requirements 5.4, 20.6, 20.7**
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';
import { createHash, randomBytes } from 'crypto';
import type { ConfigService } from '@nestjs/config';
import { MagicLinkService } from './magic-link.service';
import type { PrismaService } from '../../prisma/prisma.service';

/** 14 days in milliseconds — the magic link expiry duration */
const FOURTEEN_DAYS_MS = 14 * 24 * 60 * 60 * 1000;

/** Helper to create a mock PrismaService */
function createMockPrisma() {
  return {
    magicLink: {
      create: vi.fn(),
      findUnique: vi.fn(),
    },
    $transaction: vi.fn(),
  };
}

/** Helper to create a mock ConfigService */
function createConfigService(): ConfigService {
  return {
    get: vi.fn((_key: string, defaultValue?: string) => defaultValue),
  } as unknown as ConfigService;
}

describe('Property 8: Magic Link — Time-Based Expiry', () => {
  let service: MagicLinkService;
  let mockPrisma: ReturnType<typeof createMockPrisma>;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    mockPrisma = createMockPrisma();
    service = new MagicLinkService(mockPrisma as unknown as PrismaService, createConfigService());
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  /**
   * Arbitrary: offset in ms past the expiry point (1ms to 14 additional days)
   */
  const pastExpiryOffsetArbitrary = fc.integer({
    min: 1,
    max: 14 * 24 * 60 * 60 * 1000,
  });

  /**
   * Arbitrary: offset in ms within the valid window (0 to 14 days minus 1 second)
   */
  const withinWindowOffsetArbitrary = fc.integer({
    min: 0,
    max: FOURTEEN_DAYS_MS - 1000,
  });

  /**
   * Arbitrary: a base creation timestamp (realistic range: 2020–2026)
   */
  const creationTimestampArbitrary = fc.integer({
    min: new Date('2020-01-01').getTime(),
    max: new Date('2026-12-31').getTime(),
  });

  it('tokens are expired when current time > creation + 14 days', async () => {
    await fc.assert(
      fc.asyncProperty(
        creationTimestampArbitrary,
        pastExpiryOffsetArbitrary,
        async (creationTime, extraMs) => {
          const token = randomBytes(32).toString('base64url');
          const tokenHash = createHash('sha256').update(token).digest('hex');

          // expiresAt is creation + 14 days
          const expiresAt = new Date(creationTime + FOURTEEN_DAYS_MS);

          // Current time is AFTER expiry
          const currentTime = expiresAt.getTime() + extraMs;
          vi.setSystemTime(new Date(currentTime));

          mockPrisma.magicLink.findUnique.mockResolvedValue({
            id: 'link-id',
            tokenHash,
            candidateId: 'candidate-1',
            isConsumed: false,
            expiresAt,
            consumedAt: null,
            createdAt: new Date(creationTime),
          });

          const result = await service.validate(token);

          expect(result.valid).toBe(false);
          expect(result.reason).toBe('expired');
        },
      ),
      { numRuns: 200 },
    );
  });

  it('tokens within the 14-day window are NOT rejected on expiry grounds', async () => {
    await fc.assert(
      fc.asyncProperty(
        creationTimestampArbitrary,
        withinWindowOffsetArbitrary,
        async (creationTime, elapsedMs) => {
          const token = randomBytes(32).toString('base64url');
          const tokenHash = createHash('sha256').update(token).digest('hex');

          // expiresAt is creation + 14 days
          const expiresAt = new Date(creationTime + FOURTEEN_DAYS_MS);

          // Current time is WITHIN the window
          const currentTime = creationTime + elapsedMs;
          vi.setSystemTime(new Date(currentTime));

          mockPrisma.magicLink.findUnique.mockResolvedValue({
            id: 'link-id',
            tokenHash,
            candidateId: 'candidate-1',
            isConsumed: false,
            expiresAt,
            consumedAt: null,
            createdAt: new Date(creationTime),
          });

          const result = await service.validate(token);

          expect(result.valid).toBe(true);
          expect(result.candidateId).toBe('candidate-1');
          expect(result.reason).toBeUndefined();
        },
      ),
      { numRuns: 200 },
    );
  });

  it('token at exactly the expiry boundary (current = expiresAt + 1ms) is expired', async () => {
    await fc.assert(
      fc.asyncProperty(creationTimestampArbitrary, async (creationTime) => {
        const token = randomBytes(32).toString('base64url');
        const tokenHash = createHash('sha256').update(token).digest('hex');

        const expiresAt = new Date(creationTime + FOURTEEN_DAYS_MS);
        // 1ms after expiry
        vi.setSystemTime(new Date(expiresAt.getTime() + 1));

        mockPrisma.magicLink.findUnique.mockResolvedValue({
          id: 'link-id',
          tokenHash,
          candidateId: 'candidate-1',
          isConsumed: false,
          expiresAt,
          consumedAt: null,
          createdAt: new Date(creationTime),
        });

        const result = await service.validate(token);

        expect(result.valid).toBe(false);
        expect(result.reason).toBe('expired');
      }),
      { numRuns: 100 },
    );
  });

  it('token 1ms before expiry is still valid', async () => {
    await fc.assert(
      fc.asyncProperty(creationTimestampArbitrary, async (creationTime) => {
        const token = randomBytes(32).toString('base64url');
        const tokenHash = createHash('sha256').update(token).digest('hex');

        const expiresAt = new Date(creationTime + FOURTEEN_DAYS_MS);
        // 1ms before expiry
        vi.setSystemTime(new Date(expiresAt.getTime() - 1));

        mockPrisma.magicLink.findUnique.mockResolvedValue({
          id: 'link-id',
          tokenHash,
          candidateId: 'candidate-1',
          isConsumed: false,
          expiresAt,
          consumedAt: null,
          createdAt: new Date(creationTime),
        });

        const result = await service.validate(token);

        expect(result.valid).toBe(true);
        expect(result.candidateId).toBe('candidate-1');
      }),
      { numRuns: 100 },
    );
  });

  it('expiry is determined by comparing current time against expiresAt field', async () => {
    await fc.assert(
      fc.asyncProperty(
        creationTimestampArbitrary,
        fc.boolean(),
        async (creationTime, shouldBeExpired) => {
          const token = randomBytes(32).toString('base64url');
          const tokenHash = createHash('sha256').update(token).digest('hex');

          const expiresAt = new Date(creationTime + FOURTEEN_DAYS_MS);

          // Set current time either past or before expiry
          const currentTime = shouldBeExpired
            ? expiresAt.getTime() + 60_000 // 1 minute after expiry
            : expiresAt.getTime() - 60_000; // 1 minute before expiry
          vi.setSystemTime(new Date(currentTime));

          mockPrisma.magicLink.findUnique.mockResolvedValue({
            id: 'link-id',
            tokenHash,
            candidateId: 'candidate-1',
            isConsumed: false,
            expiresAt,
            consumedAt: null,
            createdAt: new Date(creationTime),
          });

          const result = await service.validate(token);

          if (shouldBeExpired) {
            expect(result.valid).toBe(false);
            expect(result.reason).toBe('expired');
          } else {
            expect(result.valid).toBe(true);
            expect(result.candidateId).toBe('candidate-1');
          }
        },
      ),
      { numRuns: 200 },
    );
  });
});
