import { describe, it, expect, beforeEach, vi } from 'vitest';
import { UnauthorizedException, BadRequestException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';
import { AuthService } from './auth.service';

// Mock PrismaService
const mockPrisma = {
  hrUser: {
    findUnique: vi.fn(),
  },
  session: {
    create: vi.fn(),
    update: vi.fn(),
    findUnique: vi.fn(),
  },
};

// Mock RateLimitService
const mockRateLimitService = {
  trackLoginAttempt: vi.fn().mockResolvedValue(undefined),
  checkConsecutiveFailures: vi.fn().mockResolvedValue({ allowed: true }),
  checkRequestRate: vi.fn().mockResolvedValue({ allowed: true }),
  enforceRateLimit: vi.fn().mockResolvedValue(undefined),
};

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(() => {
    vi.resetAllMocks();
    mockRateLimitService.trackLoginAttempt.mockResolvedValue(undefined);
    process.env.JWT_SECRET = 'test-secret-key-for-testing-purposes';
    service = new AuthService(mockPrisma as any, mockRateLimitService as any);
  });

  describe('login', () => {
    const validEmail = 'hr@rove.com';
    const validPassword = 'SecurePass123';
    const mockUser = {
      id: 'user-123',
      email: validEmail,
      name: 'HR Admin',
      passwordHash: '',
    };

    beforeEach(async () => {
      // Generate a real bcrypt hash for the test password
      mockUser.passwordHash = await bcrypt.hash(validPassword, 12);
    });

    it('should return login result with valid credentials', async () => {
      mockPrisma.hrUser.findUnique.mockResolvedValue(mockUser);
      mockPrisma.session.create.mockResolvedValue({
        id: 'session-123',
        userId: mockUser.id,
        tokenHash: '',
        expiresAt: new Date(),
      });
      mockPrisma.session.update.mockResolvedValue({});

      const result = await service.login(validEmail, validPassword);

      expect(result.user.id).toBe(mockUser.id);
      expect(result.user.email).toBe(mockUser.email);
      expect(result.user.name).toBe(mockUser.name);
      expect(result.token).toBeDefined();
      expect(result.expiresAt).toBeInstanceOf(Date);
      expect(result.expiresAt.getTime()).toBeGreaterThan(Date.now());
    });

    it('should sign JWT with HS256 algorithm containing userId, email, sessionId', async () => {
      mockPrisma.hrUser.findUnique.mockResolvedValue(mockUser);
      mockPrisma.session.create.mockResolvedValue({
        id: 'session-456',
        userId: mockUser.id,
        tokenHash: '',
        expiresAt: new Date(),
      });
      mockPrisma.session.update.mockResolvedValue({});

      const result = await service.login(validEmail, validPassword);

      const decoded = jwt.verify(result.token, 'test-secret-key-for-testing-purposes') as any;
      expect(decoded.userId).toBe(mockUser.id);
      expect(decoded.email).toBe(mockUser.email);
      expect(decoded.sessionId).toBe('session-456');
    });

    it('should create a session record with 8-hour expiry', async () => {
      mockPrisma.hrUser.findUnique.mockResolvedValue(mockUser);
      mockPrisma.session.create.mockResolvedValue({
        id: 'session-789',
        userId: mockUser.id,
        tokenHash: '',
        expiresAt: new Date(),
      });
      mockPrisma.session.update.mockResolvedValue({});

      await service.login(validEmail, validPassword);

      const createCall = mockPrisma.session.create.mock.calls[0][0];
      const expiresAt = createCall.data.expiresAt as Date;
      const eightHoursMs = 8 * 60 * 60 * 1000;
      const diff = expiresAt.getTime() - Date.now();
      // Should be close to 8 hours (within 5 seconds tolerance)
      expect(diff).toBeGreaterThan(eightHoursMs - 5000);
      expect(diff).toBeLessThanOrEqual(eightHoursMs);
    });

    it('should store token hash (not raw token) in session', async () => {
      mockPrisma.hrUser.findUnique.mockResolvedValue(mockUser);
      mockPrisma.session.create.mockResolvedValue({
        id: 'session-hash',
        userId: mockUser.id,
        tokenHash: '',
        expiresAt: new Date(),
      });
      mockPrisma.session.update.mockResolvedValue({});

      const result = await service.login(validEmail, validPassword);

      const updateCall = mockPrisma.session.update.mock.calls[0][0];
      const storedHash = updateCall.data.tokenHash;
      // Hash should not equal the raw token
      expect(storedHash).not.toBe(result.token);
      // Hash should be 64 hex chars (SHA-256)
      expect(storedHash).toMatch(/^[a-f0-9]{64}$/);
    });

    it('should throw generic error when email not found', async () => {
      mockPrisma.hrUser.findUnique.mockResolvedValue(null);

      await expect(service.login('unknown@example.com', validPassword)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.login('unknown@example.com', validPassword)).rejects.toThrow(
        'Invalid email or password',
      );
    });

    it('should throw generic error when password is wrong', async () => {
      mockPrisma.hrUser.findUnique.mockResolvedValue(mockUser);

      await expect(service.login(validEmail, 'WrongPassword1')).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.login(validEmail, 'WrongPassword1')).rejects.toThrow(
        'Invalid email or password',
      );
    });

    it('should throw same error for wrong email and wrong password (no differentiation)', async () => {
      // Wrong email
      mockPrisma.hrUser.findUnique.mockResolvedValueOnce(null);
      let wrongEmailError: any;
      try {
        await service.login('wrong@example.com', validPassword);
      } catch (e) {
        wrongEmailError = e;
      }

      // Wrong password
      mockPrisma.hrUser.findUnique.mockResolvedValueOnce(mockUser);
      let wrongPasswordError: any;
      try {
        await service.login(validEmail, 'WrongPassword1');
      } catch (e) {
        wrongPasswordError = e;
      }

      expect(wrongEmailError.message).toBe(wrongPasswordError.message);
    });

    it('should throw BadRequestException for invalid email format', async () => {
      await expect(service.login('not-an-email', validPassword)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException for password too short', async () => {
      await expect(service.login(validEmail, 'short')).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for password too long', async () => {
      const longPassword = 'a'.repeat(129);
      await expect(service.login(validEmail, longPassword)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for email exceeding 254 chars', async () => {
      const longEmail = 'a'.repeat(250) + '@b.co';
      await expect(service.login(longEmail, validPassword)).rejects.toThrow(BadRequestException);
    });
  });

  describe('logout', () => {
    it('should mark session as invalidated', async () => {
      mockPrisma.session.update.mockResolvedValue({});

      await service.logout('session-to-invalidate');

      expect(mockPrisma.session.update).toHaveBeenCalledWith({
        where: { id: 'session-to-invalidate' },
        data: { isInvalidated: true },
      });
    });
  });

  describe('validateSession', () => {
    it('should return payload for valid, non-invalidated, non-expired session', async () => {
      const payload = { userId: 'u1', email: 'hr@rove.com', sessionId: 's1' };
      const token = jwt.sign(payload, 'test-secret-key-for-testing-purposes', {
        algorithm: 'HS256',
        expiresIn: '8h',
      });

      mockPrisma.session.findUnique.mockResolvedValue({
        id: 's1',
        userId: 'u1',
        isInvalidated: false,
        expiresAt: new Date(Date.now() + 60000),
      });

      const result = await service.validateSession(token);
      expect(result.userId).toBe('u1');
      expect(result.email).toBe('hr@rove.com');
      expect(result.sessionId).toBe('s1');
    });

    it('should throw for invalid JWT signature', async () => {
      const token = jwt.sign(
        { userId: 'u1', email: 'hr@rove.com', sessionId: 's1' },
        'wrong-secret',
        { algorithm: 'HS256' },
      );

      await expect(service.validateSession(token)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw for expired JWT', async () => {
      const token = jwt.sign(
        { userId: 'u1', email: 'hr@rove.com', sessionId: 's1' },
        'test-secret-key-for-testing-purposes',
        { algorithm: 'HS256', expiresIn: '-1s' },
      );

      await expect(service.validateSession(token)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw when session is invalidated', async () => {
      const payload = { userId: 'u1', email: 'hr@rove.com', sessionId: 's1' };
      const token = jwt.sign(payload, 'test-secret-key-for-testing-purposes', {
        algorithm: 'HS256',
        expiresIn: '8h',
      });

      mockPrisma.session.findUnique.mockResolvedValue({
        id: 's1',
        userId: 'u1',
        isInvalidated: true,
        expiresAt: new Date(Date.now() + 60000),
      });

      await expect(service.validateSession(token)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw when session not found', async () => {
      const payload = { userId: 'u1', email: 'hr@rove.com', sessionId: 's1' };
      const token = jwt.sign(payload, 'test-secret-key-for-testing-purposes', {
        algorithm: 'HS256',
        expiresIn: '8h',
      });

      mockPrisma.session.findUnique.mockResolvedValue(null);

      await expect(service.validateSession(token)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw when session has expired (DB expiry)', async () => {
      const payload = { userId: 'u1', email: 'hr@rove.com', sessionId: 's1' };
      const token = jwt.sign(payload, 'test-secret-key-for-testing-purposes', {
        algorithm: 'HS256',
        expiresIn: '8h',
      });

      mockPrisma.session.findUnique.mockResolvedValue({
        id: 's1',
        userId: 'u1',
        isInvalidated: false,
        expiresAt: new Date(Date.now() - 1000), // Already expired
      });

      await expect(service.validateSession(token)).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('getCookieOptions', () => {
    it('should return HttpOnly=true, SameSite=lax, path=/', () => {
      const options = service.getCookieOptions();
      expect(options.httpOnly).toBe(true);
      expect(options.sameSite).toBe('lax');
      expect(options.path).toBe('/');
    });

    it('should set secure=false in development', () => {
      process.env.NODE_ENV = 'development';
      const options = service.getCookieOptions();
      expect(options.secure).toBe(false);
    });

    it('should set secure=true in production by default', () => {
      process.env.NODE_ENV = 'production';
      delete process.env.COOKIE_SECURE;
      const options = service.getCookieOptions();
      expect(options.secure).toBe(true);
    });

    it('should honor COOKIE_SECURE=false for HTTP deployments', () => {
      process.env.NODE_ENV = 'production';
      process.env.COOKIE_SECURE = 'false';
      const options = service.getCookieOptions();
      expect(options.secure).toBe(false);
    });

    it('should set maxAge to 8 hours in milliseconds', () => {
      const options = service.getCookieOptions();
      const eightHoursMs = 8 * 60 * 60 * 1000;
      expect(options.maxAge).toBe(eightHoursMs);
    });
  });
});
