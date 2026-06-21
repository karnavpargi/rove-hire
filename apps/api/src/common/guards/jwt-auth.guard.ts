import type { CanActivate, ExecutionContext } from '@nestjs/common';
import { Inject, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { GqlExecutionContext } from '@nestjs/graphql';
import { AuthService } from '../../modules/auth/auth.service';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

/**
 * Global JWT authentication guard for GraphQL resolvers.
 * Validates the session token from the 'rove_hire_session' HttpOnly cookie.
 *
 * - Skips authentication for resolvers marked with @Public()
 * - Returns AUTHENTICATION_ERROR (401) for missing/invalid/expired tokens
 * - Logs failed authentication attempts with timestamp and IP
 * - Attaches the authenticated user payload to the request for downstream use
 *
 * Requirements: 14.1, 14.2, 14.4, 14.5, 23.7
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  private readonly logger = new Logger(JwtAuthGuard.name);

  constructor(
    @Inject(Reflector) private readonly reflector: Reflector,
    @Inject(AuthService) private readonly authService: AuthService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    // JWT is enforced for GraphQL only; HTTP routes use @Public() where needed.
    if (context.getType<string>() !== 'graphql') {
      return false;
    }

    const gqlContext = GqlExecutionContext.create(context);
    const ctx = gqlContext.getContext();
    const req = ctx.req;

    // Extract token from the session cookie
    const cookieName = this.authService.getCookieName();
    const token = req?.cookies?.[cookieName];

    if (!token) {
      this.logFailedAttempt(req, 'Missing session token');
      throw new UnauthorizedException({
        code: 'AUTHENTICATION_ERROR',
        message: 'Authentication required',
      });
    }

    try {
      // Validate the token (signature, expiry, session status)
      const payload = await this.authService.validateSession(token);

      // Attach user payload to request for downstream resolvers
      req.user = payload;

      return true;
    } catch {
      this.logFailedAttempt(req, 'Invalid or expired session token');
      throw new UnauthorizedException({
        code: 'AUTHENTICATION_ERROR',
        message: 'Authentication required',
      });
    }
  }

  /**
   * Log failed authentication attempts with timestamp and IP address.
   * Requirements: 14.5
   */
  private logFailedAttempt(
    req: { ip?: string; connection?: { remoteAddress?: string } },
    reason: string,
  ): void {
    const ip = req?.ip || req?.connection?.remoteAddress || 'unknown';
    const timestamp = new Date().toISOString();

    this.logger.warn(`Auth failed: ${reason} | IP: ${ip} | Time: ${timestamp}`);
  }
}
