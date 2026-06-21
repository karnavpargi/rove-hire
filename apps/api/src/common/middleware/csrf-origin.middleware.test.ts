import { describe, it, expect, beforeEach } from 'vitest';
import { CsrfOriginMiddleware } from './csrf-origin.middleware';
import type { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';

describe('CsrfOriginMiddleware', () => {
  let mockConfigService: Partial<ConfigService>;
  let mockRes: Partial<Response>;
  let mockNext: ReturnType<typeof createMockNext>;
  let jsonMock: ReturnType<typeof createJsonMock>;

  function createMockNext() {
    let called = false;
    const fn = () => {
      called = true;
    };
    fn.wasCalled = () => called;
    return fn;
  }

  function createJsonMock() {
    let data: unknown = null;
    const fn = (d: unknown) => {
      data = d;
    };
    fn.getData = () => data;
    return fn;
  }

  function createMiddleware(env: string = 'production') {
    mockConfigService = {
      get: ((key: string) => {
        if (key === 'FRONTEND_URL') return 'https://app.rove.com';
        if (key === 'NODE_ENV') return env;
        return undefined;
      }) as any,
    };
    return new CsrfOriginMiddleware(mockConfigService as ConfigService);
  }

  beforeEach(() => {
    jsonMock = createJsonMock();
    mockRes = {
      status: ((code: number) => {
        (mockRes as any)._statusCode = code;
        return { json: jsonMock } as any;
      }) as any,
    };
    mockNext = createMockNext();
  });

  describe('in production', () => {
    let middleware: CsrfOriginMiddleware;

    beforeEach(() => {
      middleware = createMiddleware('production');
    });

    it('allows GET requests without origin check', () => {
      const req = { method: 'GET', headers: {} } as unknown as Request;
      middleware.use(req, mockRes as Response, mockNext);
      expect(mockNext.wasCalled()).toBe(true);
    });

    it('allows OPTIONS requests without origin check', () => {
      const req = { method: 'OPTIONS', headers: {} } as unknown as Request;
      middleware.use(req, mockRes as Response, mockNext);
      expect(mockNext.wasCalled()).toBe(true);
    });

    it('allows POST with matching origin header', () => {
      const req = {
        method: 'POST',
        headers: { origin: 'https://app.rove.com' },
      } as unknown as Request;
      middleware.use(req, mockRes as Response, mockNext);
      expect(mockNext.wasCalled()).toBe(true);
    });

    it('allows POST with matching referer when origin absent', () => {
      const req = {
        method: 'POST',
        headers: { referer: 'https://app.rove.com/dashboard' },
      } as unknown as Request;
      middleware.use(req, mockRes as Response, mockNext);
      expect(mockNext.wasCalled()).toBe(true);
    });

    it('rejects POST with mismatching origin', () => {
      const req = {
        method: 'POST',
        headers: { origin: 'https://evil.com' },
      } as unknown as Request;
      middleware.use(req, mockRes as Response, mockNext);
      expect(mockNext.wasCalled()).toBe(false);
      expect((mockRes as any)._statusCode).toBe(403);
      const data = jsonMock.getData() as any;
      expect(data.errors[0].extensions.code).toBe('CSRF_ERROR');
    });

    it('rejects POST without origin or referer in production', () => {
      const req = {
        method: 'POST',
        headers: {},
      } as unknown as Request;
      middleware.use(req, mockRes as Response, mockNext);
      expect(mockNext.wasCalled()).toBe(false);
      expect((mockRes as any)._statusCode).toBe(403);
    });

    it('rejects POST with mismatching referer and no origin', () => {
      const req = {
        method: 'POST',
        headers: { referer: 'https://evil.com/page' },
      } as unknown as Request;
      middleware.use(req, mockRes as Response, mockNext);
      expect(mockNext.wasCalled()).toBe(false);
      expect((mockRes as any)._statusCode).toBe(403);
    });
  });

  describe('in development', () => {
    let middleware: CsrfOriginMiddleware;

    beforeEach(() => {
      middleware = createMiddleware('development');
    });

    it('allows POST without origin in non-production', () => {
      const req = {
        method: 'POST',
        headers: {},
      } as unknown as Request;
      middleware.use(req, mockRes as Response, mockNext);
      expect(mockNext.wasCalled()).toBe(true);
    });

    it('allows POST with X-Requested-With header in non-production', () => {
      const req = {
        method: 'POST',
        headers: { 'x-requested-with': 'XMLHttpRequest' },
      } as unknown as Request;
      middleware.use(req, mockRes as Response, mockNext);
      expect(mockNext.wasCalled()).toBe(true);
    });

    it('still rejects POST with wrong origin even in dev', () => {
      const req = {
        method: 'POST',
        headers: { origin: 'https://evil.com' },
      } as unknown as Request;
      middleware.use(req, mockRes as Response, mockNext);
      expect(mockNext.wasCalled()).toBe(false);
      expect((mockRes as any)._statusCode).toBe(403);
    });
  });
});
