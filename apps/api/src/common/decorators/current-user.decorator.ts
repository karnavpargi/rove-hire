import type { ExecutionContext } from '@nestjs/common';
import { createParamDecorator } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';

/**
 * Parameter decorator to extract the authenticated user from the request.
 * The JwtAuthGuard attaches the JWT payload to req.user.
 *
 * Usage:
 *   @Query(() => Result)
 *   async myQuery(@CurrentUser() user: JwtPayload) { ... }
 *
 * Requirements: 14.1
 */
export const CurrentUser = createParamDecorator((_data: unknown, context: ExecutionContext) => {
  const gqlContext = GqlExecutionContext.create(context);
  const ctx = gqlContext.getContext();
  return ctx.req?.user;
});
