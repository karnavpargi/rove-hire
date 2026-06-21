/**
 * Property 14: Rate Limiting Enforcement
 *
 * Property-based tests verifying that:
 * 1. After N >= 5 consecutive failed attempts from same IP within 15min → blocked
 * 2. After N < 5 consecutive failures → allowed
 * 3. Valid credentials are still blocked when rate limit is active
 * 4. After 15-minute window expires, attempts are allowed again
 *
 * **Validates: Requirements 1.7, 13.4**
 */

import type { HttpException } from '@nestjs/common';
import * as fc from 'fast-check';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PrismaService } from '../../prisma/prisma.service';
import { asMock } from '../../test-utils/mock-types';
import { RateLimitService } from './rate-limit.service';

describe('Property 14: Rate Limiting Enforcement', () => {
  let service: RateLimitService;
  let mockPrisma: {
    loginAttempt: {
      create: ReturnType<typeof vi.fn>;
      findMany: ReturnType<typeof vi.fn>;
      count: ReturnType<typeof vi.fn>;
      findFirst: ReturnType<typeof vi.fn>;
    };
  };

  beforeEach(() => {
    vi.resetAllMocks();
    mockPrisma = {
      loginAttempt: {
        create: vi.fn().mockResolvedValue({}),
        findMany: vi.fn(),
        count: vi.fn().mockResolvedValue(0),
        findFirst: vi.fn(),
      },
    };
    service = new RateLimitService(asMock<PrismaService>(mockPrisma));
  });

  /**
   * Arbitrary for generating a valid IP address (source identifier).
   */
  const ipArbitrary = fc
    .tuple(
      fc.integer({ min: 1, max: 255 }),
      fc.integer({ min: 0, max: 255 }),
      fc.integer({ min: 0, max: 255 }),
      fc.integer({ min: 1, max: 254 }),
    )
    .map(([a, b, c, d]) => `${a}.${b}.${c}.${d}`);

  /**
   * Arbitrary for generating a count of failures that triggers blocking (N >= 5).
   */
  const blockingFailureCountArbitrary = fc.integer({ min: 5, max: 50 });

  /**
   * Arbitrary for generating a count of failures that does NOT trigger blocking (N < 5).
   */
  const allowedFailureCountArbitrary = fc.integer({ min: 0, max: 4 });

  /**
   * Helper: creates an array of N failure login attempt records within the 15-min window.
   * All failures are consecutive (no success in between) and recent.
   */
  function createConsecutiveFailures(source: string, count: number, baseTime: Date = new Date()) {
    return Array.from({ length: count }, (_, i) => ({
      source,
      success: false,
      attemptedAt: new Date(baseTime.getTime() - i * 30_000), // 30s apart
    }));
  }

  /**
   * Sub-property 1: For any N >= 5 consecutive failures from same IP within 15min → blocked.
   *
   * The service queries the last 5 attempts (ordered desc, take 5).
   * If all 5 are failures within the window, the source is blocked.
   */
  it('blocks access after N >= 5 consecutive failures from same IP within 15-minute window', async () => {
    await fc.assert(
      fc.asyncProperty(ipArbitrary, blockingFailureCountArbitrary, async (ip, failureCount) => {
        vi.resetAllMocks();
        mockPrisma.loginAttempt.count.mockResolvedValue(0);

        const now = new Date();
        // The service only looks at the last 5 attempts (take: MAX_CONSECUTIVE_FAILURES)
        // So we return min(failureCount, 5) records — all failures, all within window
        const returnedAttempts = createConsecutiveFailures(ip, Math.min(failureCount, 5), now);

        mockPrisma.loginAttempt.findMany.mockResolvedValue(returnedAttempts);

        const result = await service.checkConsecutiveFailures(ip);

        // Must be blocked
        expect(result.allowed).toBe(false);
        expect(result.reason).toBe('consecutive_failures');
        expect(result.retryAfterSeconds).toBeGreaterThan(0);
        expect(result.retryAfterSeconds).toBeLessThanOrEqual(15 * 60); // Max 15 min
      }),
      { numRuns: 100 },
    );
  });

  /**
   * Sub-property 2: For any N < 5 consecutive failures → access is allowed.
   */
  it('allows access when fewer than 5 consecutive failures from same IP', async () => {
    await fc.assert(
      fc.asyncProperty(ipArbitrary, allowedFailureCountArbitrary, async (ip, failureCount) => {
        vi.resetAllMocks();
        mockPrisma.loginAttempt.count.mockResolvedValue(0);

        const now = new Date();
        const returnedAttempts = createConsecutiveFailures(ip, failureCount, now);

        mockPrisma.loginAttempt.findMany.mockResolvedValue(returnedAttempts);

        const result = await service.checkConsecutiveFailures(ip);

        // Must be allowed
        expect(result.allowed).toBe(true);
        expect(result.retryAfterSeconds).toBeUndefined();
        expect(result.reason).toBeUndefined();
      }),
      { numRuns: 100 },
    );
  });

  /**
   * Sub-property 3: Valid credentials are still blocked when rate limit is active.
   *
   * Even if the next attempt would be valid credentials, enforceRateLimit throws
   * before the credentials can be checked. We simulate: 5 failures exist, then
   * the next call to enforceRateLimit should throw regardless.
   */
  it('blocks even valid credential attempts when rate limit is active', async () => {
    await fc.assert(
      fc.asyncProperty(ipArbitrary, blockingFailureCountArbitrary, async (ip, failureCount) => {
        vi.resetAllMocks();

        const now = new Date();
        const returnedAttempts = createConsecutiveFailures(ip, Math.min(failureCount, 5), now);

        // Request rate passes (not exceeding per-window request count)
        mockPrisma.loginAttempt.count.mockResolvedValue(3);
        // Consecutive failures check — returns 5 failures
        mockPrisma.loginAttempt.findMany.mockResolvedValue(returnedAttempts);

        // enforceRateLimit should throw even though the request rate check passes
        try {
          await service.enforceRateLimit(ip);
          // Should not reach here
          expect(true).toBe(false);
        } catch (error: unknown) {
          expect((error as HttpException).getStatus()).toBe(429);
          const response = (error as HttpException).getResponse() as {
            code: string;
            message: string;
            retryAfter: number;
          };
          expect(response.code).toBe('RATE_LIMIT_ERROR');
          expect(response.message).toContain('temporarily locked');
          expect(response.retryAfter).toBeGreaterThan(0);
        }
      }),
      { numRuns: 100 },
    );
  });

  /**
   * Sub-property 4: After the 15-minute window expires, attempts are allowed again.
   *
   * If all 5 failures occurred more than 15 minutes ago, they fall outside the
   * query window (attemptedAt >= windowStart), so the DB returns no records
   * within the window → access is allowed.
   */
  it('allows access after 15-minute lockout window expires', async () => {
    await fc.assert(
      fc.asyncProperty(
        ipArbitrary,
        fc.integer({ min: 16, max: 120 }), // minutes since failures (> 15 min)
        async (ip, _minutesSinceFailures) => {
          vi.resetAllMocks();
          mockPrisma.loginAttempt.count.mockResolvedValue(0);

          // The service queries with: attemptedAt >= (now - 15min)
          // Since failures are older than 15min, findMany returns empty or no matching records
          // Simulating: DB returns nothing within the window because all failures expired
          mockPrisma.loginAttempt.findMany.mockResolvedValue([]);

          const result = await service.checkConsecutiveFailures(ip);

          // Must be allowed — window has expired
          expect(result.allowed).toBe(true);
          expect(result.retryAfterSeconds).toBeUndefined();
          expect(result.reason).toBeUndefined();
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Additional property: A success within the last 5 attempts resets the
   * consecutive failure count, so even if there are many failures total,
   * any success breaks the chain.
   */
  it('allows access when a success exists within the most recent 5 attempts', async () => {
    await fc.assert(
      fc.asyncProperty(
        ipArbitrary,
        fc.integer({ min: 0, max: 4 }), // position of the success in the last 5
        async (ip, successPosition) => {
          vi.resetAllMocks();
          mockPrisma.loginAttempt.count.mockResolvedValue(0);

          const now = new Date();
          // Create 5 attempts, but place one success at a random position
          const attempts = Array.from({ length: 5 }, (_, i) => ({
            source: ip,
            success: i === successPosition,
            attemptedAt: new Date(now.getTime() - i * 30_000),
          }));

          mockPrisma.loginAttempt.findMany.mockResolvedValue(attempts);

          const result = await service.checkConsecutiveFailures(ip);

          // Must be allowed because not ALL 5 are failures
          expect(result.allowed).toBe(true);
        },
      ),
      { numRuns: 100 },
    );
  });
});
