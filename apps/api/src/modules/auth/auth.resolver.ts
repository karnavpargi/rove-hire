import { Resolver, Mutation, Query, Args, Context, ObjectType, Field } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import type { AuthService } from './auth.service';
import { RateLimitGuard } from './rate-limit.guard';
import { Public } from '../../common/decorators';

@ObjectType()
class AuthUser {
  @Field()
  id!: string;

  @Field()
  email!: string;

  @Field()
  name!: string;
}

@ObjectType()
class LoginResponse {
  @Field(() => AuthUser)
  user!: AuthUser;

  @Field()
  expiresAt!: Date;
}

@Resolver()
export class AuthResolver {
  constructor(private readonly authService: AuthService) {}

  /**
   * Login mutation — authenticates HR user and sets session cookie.
   * Rate-limited: 10 requests per 60s per IP, locked after 5 consecutive failures.
   * Returns user info on success.
   *
   * Requirements: 1.2, 1.3, 1.7, 1.8, 1.9, 13.4, 13.7, 13.8, 13.11
   */
  @Public()
  @UseGuards(RateLimitGuard)
  @Mutation(() => LoginResponse, { description: 'Authenticate HR user with email and password' })
  async login(
    @Args('email') email: string,
    @Args('password') password: string,
    @Context()
    ctx: {
      req: {
        ip?: string;
        headers?: Record<string, string | string[] | undefined>;
        connection?: { remoteAddress?: string };
      };
      res: { cookie: (name: string, value: string, options: object) => void };
    },
  ): Promise<LoginResponse> {
    const ip = this.extractIp(ctx.req);
    const result = await this.authService.login(email, password, ip);

    // Set HttpOnly/Secure/SameSite=Lax cookie
    ctx.res.cookie(
      this.authService.getCookieName(),
      result.token,
      this.authService.getCookieOptions(),
    );

    return {
      user: result.user,
      expiresAt: result.expiresAt,
    };
  }

  /**
   * Logout mutation — invalidates session and clears cookie.
   * Marked public because it needs to work even with expired tokens.
   *
   * Requirements: 1.5
   */
  @Public()
  @Mutation(() => Boolean, { description: 'Invalidate current session and clear cookie' })
  async logout(
    @Context()
    ctx: {
      req: { cookies?: Record<string, string> };
      res: { clearCookie: (name: string, options: object) => void };
    },
  ): Promise<boolean> {
    const token = ctx.req.cookies?.[this.authService.getCookieName()];
    if (token) {
      try {
        const payload = await this.authService.validateSession(token);
        await this.authService.logout(payload.sessionId);
      } catch {
        // Session already invalid — still clear cookie
      }
    }

    ctx.res.clearCookie(this.authService.getCookieName(), this.authService.getCookieOptions());

    return true;
  }

  /**
   * Query to validate current session (check if user is authenticated).
   * Marked public because it returns null gracefully for unauthenticated users.
   *
   * Requirements: 1.4, 1.6
   */
  @Public()
  @Query(() => AuthUser, {
    nullable: true,
    description: 'Validate current session and return authenticated user',
  })
  async me(
    @Context() ctx: { req: { cookies?: Record<string, string> } },
  ): Promise<AuthUser | null> {
    const token = ctx.req.cookies?.[this.authService.getCookieName()];
    if (!token) {
      return null;
    }

    try {
      const payload = await this.authService.validateSession(token);
      return {
        id: payload.userId,
        email: payload.email,
        name: '', // Will be populated by a field resolver if needed
      };
    } catch {
      return null;
    }
  }

  /**
   * Extract client IP from request, supporting X-Forwarded-For for proxied environments.
   */
  private extractIp(request: {
    ip?: string;
    headers?: Record<string, string | string[] | undefined>;
    connection?: { remoteAddress?: string };
  }): string {
    const forwarded = request.headers?.['x-forwarded-for'];
    if (forwarded) {
      const ip = Array.isArray(forwarded) ? forwarded[0] : forwarded.split(',')[0];
      return ip.trim();
    }
    return request.ip || request.connection?.remoteAddress || 'unknown';
  }
}
