import { HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

/** Result of a rate limit check */
export interface RateLimitResult {
  allowed: boolean;
  retryAfterSeconds?: number;
  reason?: 'consecutive_failures' | 'request_rate_exceeded';
}

/** Constants for rate limiting */
const MAX_CONSECUTIVE_FAILURES = 5;
const LOCKOUT_WINDOW_MINUTES = 15;
const MAX_REQUESTS_PER_WINDOW = 10;
const REQUEST_WINDOW_SECONDS = 60;

@Injectable()
export class RateLimitService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  /**
   * Track a login attempt (success or failure) for rate limiting purposes.
   * Stores the attempt in the LoginAttempt table.
   *
   * Requirements: 1.7, 13.4
   */
  async trackLoginAttempt(source: string, success: boolean): Promise<void> {
    await this.prisma.loginAttempt.create({
      data: {
        source,
        success,
        attemptedAt: new Date(),
      },
    });
  }

  /**
   * Check if a source IP is currently rate-limited due to consecutive failures.
   * Blocks after 5 consecutive failures from same IP within 15 minutes.
   *
   * Requirements: 1.7, 13.4
   */
  async checkConsecutiveFailures(source: string): Promise<RateLimitResult> {
    const windowStart = new Date(Date.now() - LOCKOUT_WINDOW_MINUTES * 60 * 1000);

    // Get recent attempts from this source within the 15-minute window
    const recentAttempts = await this.prisma.loginAttempt.findMany({
      where: {
        source,
        attemptedAt: { gte: windowStart },
      },
      orderBy: { attemptedAt: 'desc' },
      take: MAX_CONSECUTIVE_FAILURES,
    });

    // Check if we have 5+ consecutive failures (no successes in between)
    if (recentAttempts.length >= MAX_CONSECUTIVE_FAILURES) {
      const allFailed = recentAttempts.every((attempt) => !attempt.success);
      if (allFailed) {
        // Calculate retry-after: time until oldest failure in window expires
        const oldestFailure = recentAttempts[recentAttempts.length - 1];
        const unlockTime = new Date(
          oldestFailure.attemptedAt.getTime() + LOCKOUT_WINDOW_MINUTES * 60 * 1000,
        );
        const retryAfterSeconds = Math.ceil((unlockTime.getTime() - Date.now()) / 1000);

        return {
          allowed: false,
          retryAfterSeconds: Math.max(retryAfterSeconds, 1),
          reason: 'consecutive_failures',
        };
      }
    }

    return { allowed: true };
  }

  /**
   * Check if a source IP has exceeded the per-window request rate limit.
   * Enforces max 10 requests per 60-second window per IP on auth endpoints.
   *
   * Requirements: 13.11
   */
  async checkRequestRate(source: string): Promise<RateLimitResult> {
    const windowStart = new Date(Date.now() - REQUEST_WINDOW_SECONDS * 1000);

    const requestCount = await this.prisma.loginAttempt.count({
      where: {
        source,
        attemptedAt: { gte: windowStart },
      },
    });

    if (requestCount >= MAX_REQUESTS_PER_WINDOW) {
      // Find the oldest attempt in current window to calculate retry-after
      const oldestInWindow = await this.prisma.loginAttempt.findFirst({
        where: {
          source,
          attemptedAt: { gte: windowStart },
        },
        orderBy: { attemptedAt: 'asc' },
      });

      let retryAfterSeconds = REQUEST_WINDOW_SECONDS;
      if (oldestInWindow) {
        const windowExpiry = new Date(
          oldestInWindow.attemptedAt.getTime() + REQUEST_WINDOW_SECONDS * 1000,
        );
        retryAfterSeconds = Math.ceil((windowExpiry.getTime() - Date.now()) / 1000);
      }

      return {
        allowed: false,
        retryAfterSeconds: Math.max(retryAfterSeconds, 1),
        reason: 'request_rate_exceeded',
      };
    }

    return { allowed: true };
  }

  /**
   * Perform full rate limit check: both consecutive failures and request rate.
   * Throws HttpException with Retry-After header info when blocked.
   *
   * Requirements: 1.7, 13.4, 13.11
   */
  async enforceRateLimit(source: string): Promise<void> {
    // Check request rate first (faster check)
    const rateResult = await this.checkRequestRate(source);
    if (!rateResult.allowed) {
      throw new HttpException(
        {
          code: 'RATE_LIMIT_ERROR',
          message: 'Too many requests. Please try again later.',
          retryAfter: rateResult.retryAfterSeconds,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    // Check consecutive failure lockout
    const lockoutResult = await this.checkConsecutiveFailures(source);
    if (!lockoutResult.allowed) {
      throw new HttpException(
        {
          code: 'RATE_LIMIT_ERROR',
          message:
            'Account temporarily locked due to too many failed login attempts. Please try again later.',
          retryAfter: lockoutResult.retryAfterSeconds,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }
}
