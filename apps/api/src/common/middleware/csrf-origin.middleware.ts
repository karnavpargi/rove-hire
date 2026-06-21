import type { NestMiddleware } from '@nestjs/common';
import { Injectable } from '@nestjs/common';
import type { Request, Response, NextFunction } from 'express';
import type { ConfigService } from '@nestjs/config';

/**
 * CSRF protection via Origin/Referer header validation.
 *
 * Since GraphQL uses POST for all operations (queries and mutations),
 * traditional token-based CSRF is impractical. Instead, we validate that:
 * 1. State-changing requests (POST, PUT, PATCH, DELETE) include an
 *    Origin or Referer header
 * 2. The Origin/Referer matches the configured FRONTEND_URL
 *
 * Combined with SameSite=Lax cookies, this prevents CSRF attacks
 * because cross-origin form submissions and fetch requests from
 * untrusted origins will be rejected.
 *
 * Non-browser clients (e.g., GraphQL Playground in dev) can bypass
 * by setting the X-Requested-With header or when NODE_ENV is not production.
 *
 * Requirements: 13.3
 */
@Injectable()
export class CsrfOriginMiddleware implements NestMiddleware {
  private readonly frontendUrl: string;
  private readonly isProduction: boolean;

  constructor(private readonly configService: ConfigService) {
    this.frontendUrl = this.configService.get<string>('FRONTEND_URL') ?? 'http://localhost:3000';
    this.isProduction = this.configService.get<string>('NODE_ENV') === 'production';
  }

  use(req: Request, res: Response, next: NextFunction): void {
    // Only validate state-changing methods
    if (['GET', 'OPTIONS', 'HEAD'].includes(req.method)) {
      return next();
    }

    // In non-production, allow requests with X-Requested-With header
    // (for GraphQL Playground and development tools)
    if (!this.isProduction && req.headers['x-requested-with']) {
      return next();
    }

    const origin = req.headers['origin'];
    const referer = req.headers['referer'];

    // Allow requests from the configured frontend origin
    if (origin && this.isAllowedOrigin(origin)) {
      return next();
    }

    // Fall back to checking referer if origin is absent
    if (!origin && referer && this.isAllowedReferer(referer)) {
      return next();
    }

    // In non-production environments, allow requests without origin
    // (e.g., server-to-server, Postman, curl)
    if (!this.isProduction && !origin && !referer) {
      return next();
    }

    res.status(403).json({
      errors: [
        {
          message: 'Forbidden: CSRF validation failed',
          extensions: {
            code: 'CSRF_ERROR',
            details: 'Request origin does not match the allowed frontend application',
          },
        },
      ],
    });
  }

  private isAllowedOrigin(origin: string): boolean {
    return origin === this.frontendUrl;
  }

  private isAllowedReferer(referer: string): boolean {
    try {
      const refererUrl = new URL(referer);
      const frontendUrlObj = new URL(this.frontendUrl);
      return refererUrl.origin === frontendUrlObj.origin;
    } catch {
      return false;
    }
  }
}
