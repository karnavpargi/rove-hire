import type { CanActivate, ExecutionContext } from '@nestjs/common';
import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import type { RateLimitService } from './rate-limit.service';

/**
 * Guard that enforces rate limiting on auth endpoints.
 * Checks both:
 * - 10 requests per 60-second window per IP
 * - 5 consecutive failure lockout (15 minutes)
 *
 * Returns Retry-After info in error response when rate limited.
 *
 * Requirements: 1.7, 13.4, 13.11
 */
@Injectable()
export class RateLimitGuard implements CanActivate {
  constructor(private readonly rateLimitService: RateLimitService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const ctx = GqlExecutionContext.create(context);
    const request = ctx.getContext().req;

    const source = this.extractIp(request);

    try {
      await this.rateLimitService.enforceRateLimit(source);
      return true;
    } catch (error) {
      if (error instanceof HttpException) {
        // Re-throw with Retry-After header context
        const response = error.getResponse() as Record<string, unknown>;
        throw new HttpException(
          {
            code: 'RATE_LIMIT_ERROR',
            message: response.message || 'Too many requests. Please try again later.',
            retryAfter: response.retryAfter,
          },
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
      throw error;
    }
  }

  /**
   * Extract the client IP address from the request.
   * Supports X-Forwarded-For header for proxy environments.
   */
  private extractIp(request: {
    ip?: string;
    headers?: Record<string, string | string[] | undefined>;
    connection?: { remoteAddress?: string };
  }): string {
    // Check X-Forwarded-For first (for reverse-proxy environments)
    const forwarded = request.headers?.['x-forwarded-for'];
    if (forwarded) {
      const ip = Array.isArray(forwarded) ? forwarded[0] : forwarded.split(',')[0];
      return ip.trim();
    }

    // Fall back to request.ip or connection.remoteAddress
    return request.ip || request.connection?.remoteAddress || 'unknown';
  }
}
