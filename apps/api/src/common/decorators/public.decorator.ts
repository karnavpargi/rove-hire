import { SetMetadata } from '@nestjs/common';

/**
 * Metadata key for the @Public() decorator.
 * Used by JwtAuthGuard to skip authentication on marked resolvers.
 */
export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Marks a resolver or controller method as public (no auth required).
 * Apply to resolvers that should be accessible without a valid session token.
 *
 * Usage:
 *   @Public()
 *   @Query(() => Result)
 *   async publicQuery() { ... }
 *
 * Requirements: 14.4
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
