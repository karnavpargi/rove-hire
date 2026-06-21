import { describe, it, expect, beforeEach } from 'vitest';
import { ContentTypeMiddleware } from './content-type.middleware';
import { Request, Response } from 'express';

describe('ContentTypeMiddleware', () => {
  let middleware: ContentTypeMiddleware;
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

  beforeEach(() => {
    middleware = new ContentTypeMiddleware();
    jsonMock = createJsonMock();
    mockRes = {
      status: ((code: number) => {
        (mockRes as any)._statusCode = code;
        return { json: jsonMock } as any;
      }) as any,
    };
    mockNext = createMockNext();
  });

  it('allows GET requests regardless of content-type', () => {
    const req = { method: 'GET', headers: {} } as unknown as Request;
    middleware.use(req, mockRes as Response, mockNext);
    expect(mockNext.wasCalled()).toBe(true);
  });

  it('allows OPTIONS requests regardless of content-type', () => {
    const req = { method: 'OPTIONS', headers: {} } as unknown as Request;
    middleware.use(req, mockRes as Response, mockNext);
    expect(mockNext.wasCalled()).toBe(true);
  });

  it('allows HEAD requests regardless of content-type', () => {
    const req = { method: 'HEAD', headers: {} } as unknown as Request;
    middleware.use(req, mockRes as Response, mockNext);
    expect(mockNext.wasCalled()).toBe(true);
  });

  it('allows POST with application/json content-type', () => {
    const req = {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
    } as unknown as Request;
    middleware.use(req, mockRes as Response, mockNext);
    expect(mockNext.wasCalled()).toBe(true);
  });

  it('allows POST with application/json; charset=utf-8', () => {
    const req = {
      method: 'POST',
      headers: { 'content-type': 'application/json; charset=utf-8' },
    } as unknown as Request;
    middleware.use(req, mockRes as Response, mockNext);
    expect(mockNext.wasCalled()).toBe(true);
  });

  it('allows POST with multipart/form-data content-type', () => {
    const req = {
      method: 'POST',
      headers: { 'content-type': 'multipart/form-data; boundary=----abc' },
    } as unknown as Request;
    middleware.use(req, mockRes as Response, mockNext);
    expect(mockNext.wasCalled()).toBe(true);
  });

  it('rejects POST with text/plain content-type', () => {
    const req = {
      method: 'POST',
      headers: { 'content-type': 'text/plain' },
    } as unknown as Request;
    middleware.use(req, mockRes as Response, mockNext);
    expect(mockNext.wasCalled()).toBe(false);
    expect((mockRes as any)._statusCode).toBe(415);
    const data = jsonMock.getData() as any;
    expect(data.errors[0].extensions.code).toBe('UNSUPPORTED_MEDIA_TYPE');
  });

  it('rejects POST with application/xml content-type', () => {
    const req = {
      method: 'POST',
      headers: { 'content-type': 'application/xml' },
    } as unknown as Request;
    middleware.use(req, mockRes as Response, mockNext);
    expect(mockNext.wasCalled()).toBe(false);
    expect((mockRes as any)._statusCode).toBe(415);
  });

  it('rejects POST without content-type header', () => {
    const req = {
      method: 'POST',
      headers: {},
    } as unknown as Request;
    middleware.use(req, mockRes as Response, mockNext);
    expect(mockNext.wasCalled()).toBe(false);
    expect((mockRes as any)._statusCode).toBe(415);
    const data = jsonMock.getData() as any;
    expect(data.errors[0].message).toContain('Content-Type header is required');
  });
});
