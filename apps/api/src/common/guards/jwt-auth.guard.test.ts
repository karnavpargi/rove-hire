import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ExecutionContext } from '@nestjs/common';
import { UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtAuthGuard } from './jwt-auth.guard';
import type { AuthService } from '../../modules/auth/auth.service';

// Mock GqlExecutionContext
vi.mock('@nestjs/graphql', () => ({
  GqlExecutionContext: {
    create: (ctx: ExecutionContext) => ({
      getContext: () => (ctx as any).__gqlContext,
    }),
  },
}));

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;
  let reflector: Reflector;
  let authService: Partial<AuthService>;

  beforeEach(() => {
    reflector = new Reflector();
    authService = {
      getCookieName: vi.fn().mockReturnValue('rove_hire_session'),
      validateSession: vi.fn(),
    };
    guard = new JwtAuthGuard(reflector, authService as AuthService);
  });

  function createMockContext(options: {
    isPublic?: boolean;
    cookies?: Record<string, string>;
    ip?: string;
  }): ExecutionContext {
    const { isPublic = false, cookies = {}, ip = '127.0.0.1' } = options;

    // Mock reflector to return isPublic
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(isPublic);

    const req = { cookies, ip, user: undefined as any };
    const context = {
      getHandler: () => ({}),
      getClass: () => ({}),
      getType: () => 'graphql',
      __gqlContext: { req },
    } as any;

    return context;
  }

  it('should allow access for @Public() decorated resolvers', async () => {
    const ctx = createMockContext({ isPublic: true });
    const result = await guard.canActivate(ctx);
    expect(result).toBe(true);
    expect(authService.validateSession).not.toHaveBeenCalled();
  });

  it('should throw AUTHENTICATION_ERROR when no token cookie is present', async () => {
    const ctx = createMockContext({ cookies: {} });
    await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
    await expect(guard.canActivate(ctx)).rejects.toMatchObject({
      response: {
        code: 'AUTHENTICATION_ERROR',
        message: 'Authentication required',
      },
    });
  });

  it('should throw AUTHENTICATION_ERROR when token is invalid', async () => {
    (authService.validateSession as any).mockRejectedValue(
      new UnauthorizedException('Session expired or invalid'),
    );

    const ctx = createMockContext({
      cookies: { rove_hire_session: 'invalid-token' },
    });

    await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
    await expect(guard.canActivate(ctx)).rejects.toMatchObject({
      response: {
        code: 'AUTHENTICATION_ERROR',
        message: 'Authentication required',
      },
    });
  });

  it('should allow access and attach user to request when token is valid', async () => {
    const mockPayload = {
      userId: 'user-123',
      email: 'hr@rove.com',
      sessionId: 'session-456',
    };
    (authService.validateSession as any).mockResolvedValue(mockPayload);

    const ctx = createMockContext({
      cookies: { rove_hire_session: 'valid-token' },
    });

    const result = await guard.canActivate(ctx);
    expect(result).toBe(true);
    expect(authService.validateSession).toHaveBeenCalledWith('valid-token');

    // Verify user is attached to request
    const gqlCtx = (ctx as any).__gqlContext;
    expect(gqlCtx.req.user).toEqual(mockPayload);
  });

  it('should throw AUTHENTICATION_ERROR when token is expired', async () => {
    (authService.validateSession as any).mockRejectedValue(
      new UnauthorizedException('Session expired or invalid'),
    );

    const ctx = createMockContext({
      cookies: { rove_hire_session: 'expired-token' },
    });

    await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
  });

  it('should allow @Public() HTTP routes without authentication', async () => {
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(true);

    const context = {
      getHandler: () => ({}),
      getClass: () => ({}),
      getType: () => 'http',
    } as ExecutionContext;

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(authService.validateSession).not.toHaveBeenCalled();
  });

  it('should deny non-public HTTP routes', async () => {
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);

    const context = {
      getHandler: () => ({}),
      getClass: () => ({}),
      getType: () => 'http',
    } as ExecutionContext;

    await expect(guard.canActivate(context)).resolves.toBe(false);
  });

  it('should log failed auth attempts with IP and timestamp', async () => {
    const logSpy = vi.spyOn((guard as any).logger, 'warn');

    const ctx = createMockContext({
      cookies: {},
      ip: '192.168.1.1',
    });

    try {
      await guard.canActivate(ctx);
    } catch {
      // Expected to throw
    }

    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('192.168.1.1'));
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Missing session token'));
  });
});
