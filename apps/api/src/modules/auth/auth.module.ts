import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AuthService } from './auth.service';
import { AuthResolver } from './auth.resolver';
import { JwtAuthGuard } from '../../common/guards';
import { RateLimitService } from './rate-limit.service';
import { RateLimitGuard } from './rate-limit.guard';

/**
 * AuthModule provides authentication services:
 * - Login with email/password (bcrypt cost 12)
 * - JWT session management (8-hour HttpOnly cookie)
 * - Logout (session invalidation)
 * - Session validation
 * - Global JwtAuthGuard (APP_GUARD) for all GraphQL resolvers
 * - Rate limiting (5 consecutive failures lockout, 10 req/60s per IP)
 *
 * PrismaModule is global, so PrismaService is available without import.
 *
 * Requirements: 1.7, 13.4, 13.11, 14.1, 14.2, 14.4, 14.5
 */
@Module({
  providers: [
    AuthService,
    AuthResolver,
    RateLimitService,
    RateLimitGuard,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
  exports: [AuthService, RateLimitService],
})
export class AuthModule {}
