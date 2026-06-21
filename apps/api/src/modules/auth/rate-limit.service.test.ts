import { HttpException, HttpStatus } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PrismaService } from '../../prisma/prisma.service';
import { asMock } from '../../test-utils/mock-types';
import { RateLimitService } from './rate-limit.service';

// Mock PrismaService
const mockPrisma = {
  loginAttempt: {
    create: vi.fn(),
    findMany: vi.fn(),
    count: vi.fn(),
    findFirst: vi.fn(),
  },
};

describe('RateLimitService', () => {
  let service: RateLimitService;

  beforeEach(() => {
    vi.resetAllMocks();
    service = new RateLimitService(asMock<PrismaService>(mockPrisma));
  });

  describe('trackLoginAttempt', () => {
    it('should create a login attempt record with source, success, and timestamp', async () => {
      mockPrisma.loginAttempt.create.mockResolvedValue({});

      await service.trackLoginAttempt('192.168.1.1', false);

      expect(mockPrisma.loginAttempt.create).toHaveBeenCalledWith({
        data: {
          source: '192.168.1.1',
          success: false,
          attemptedAt: expect.any(Date),
        },
      });
    });

    it('should track successful attempts', async () => {
      mockPrisma.loginAttempt.create.mockResolvedValue({});

      await service.trackLoginAttempt('10.0.0.1', true);

      expect(mockPrisma.loginAttempt.create).toHaveBeenCalledWith({
        data: {
          source: '10.0.0.1',
          success: true,
          attemptedAt: expect.any(Date),
        },
      });
    });
  });

  describe('checkConsecutiveFailures', () => {
    it('should allow when fewer than 5 failures', async () => {
      mockPrisma.loginAttempt.findMany.mockResolvedValue([
        { source: '192.168.1.1', success: false, attemptedAt: new Date() },
        { source: '192.168.1.1', success: false, attemptedAt: new Date() },
        { source: '192.168.1.1', success: false, attemptedAt: new Date() },
      ]);

      const result = await service.checkConsecutiveFailures('192.168.1.1');
      expect(result.allowed).toBe(true);
    });

    it('should block after 5 consecutive failures within 15 minutes', async () => {
      const now = new Date();
      const failures = Array.from({ length: 5 }, (_, i) => ({
        source: '192.168.1.1',
        success: false,
        attemptedAt: new Date(now.getTime() - i * 60000), // 1 min apart
      }));
      mockPrisma.loginAttempt.findMany.mockResolvedValue(failures);

      const result = await service.checkConsecutiveFailures('192.168.1.1');
      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('consecutive_failures');
      expect(result.retryAfterSeconds).toBeGreaterThan(0);
    });

    it('should allow when there is a success within the last 5 attempts', async () => {
      const now = new Date();
      mockPrisma.loginAttempt.findMany.mockResolvedValue([
        { source: '192.168.1.1', success: false, attemptedAt: new Date(now.getTime() - 1000) },
        { source: '192.168.1.1', success: false, attemptedAt: new Date(now.getTime() - 2000) },
        { source: '192.168.1.1', success: true, attemptedAt: new Date(now.getTime() - 3000) },
        { source: '192.168.1.1', success: false, attemptedAt: new Date(now.getTime() - 4000) },
        { source: '192.168.1.1', success: false, attemptedAt: new Date(now.getTime() - 5000) },
      ]);

      const result = await service.checkConsecutiveFailures('192.168.1.1');
      expect(result.allowed).toBe(true);
    });

    it('should return retryAfterSeconds calculated from oldest failure in window', async () => {
      const now = new Date();
      const oldestTime = new Date(now.getTime() - 10 * 60 * 1000); // 10 min ago
      const failures = Array.from({ length: 5 }, (_, i) => ({
        source: '192.168.1.1',
        success: false,
        attemptedAt: i === 4 ? oldestTime : new Date(now.getTime() - i * 60000),
      }));
      mockPrisma.loginAttempt.findMany.mockResolvedValue(failures);

      const result = await service.checkConsecutiveFailures('192.168.1.1');
      expect(result.allowed).toBe(false);
      // Unlock time: oldest (10min ago) + 15min = 5min from now = ~300s
      expect(result.retryAfterSeconds).toBeGreaterThan(200);
      expect(result.retryAfterSeconds).toBeLessThanOrEqual(310);
    });
  });

  describe('checkRequestRate', () => {
    it('should allow when under 10 requests in 60s window', async () => {
      mockPrisma.loginAttempt.count.mockResolvedValue(5);

      const result = await service.checkRequestRate('192.168.1.1');
      expect(result.allowed).toBe(true);
    });

    it('should block when 10 or more requests in 60s window', async () => {
      mockPrisma.loginAttempt.count.mockResolvedValue(10);
      mockPrisma.loginAttempt.findFirst.mockResolvedValue({
        attemptedAt: new Date(Date.now() - 30000), // 30s ago
      });

      const result = await service.checkRequestRate('192.168.1.1');
      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('request_rate_exceeded');
      expect(result.retryAfterSeconds).toBeGreaterThan(0);
      expect(result.retryAfterSeconds).toBeLessThanOrEqual(60);
    });

    it('should calculate retryAfter based on oldest request in window', async () => {
      const oldestRequest = new Date(Date.now() - 50000); // 50s ago
      mockPrisma.loginAttempt.count.mockResolvedValue(10);
      mockPrisma.loginAttempt.findFirst.mockResolvedValue({
        attemptedAt: oldestRequest,
      });

      const result = await service.checkRequestRate('192.168.1.1');
      expect(result.allowed).toBe(false);
      // Window expiry: 50s ago + 60s = 10s from now
      expect(result.retryAfterSeconds).toBeGreaterThan(5);
      expect(result.retryAfterSeconds).toBeLessThanOrEqual(15);
    });
  });

  describe('enforceRateLimit', () => {
    it('should not throw when both rate checks pass', async () => {
      mockPrisma.loginAttempt.count.mockResolvedValue(3);
      mockPrisma.loginAttempt.findMany.mockResolvedValue([
        { source: '10.0.0.1', success: false, attemptedAt: new Date() },
      ]);

      await expect(service.enforceRateLimit('10.0.0.1')).resolves.toBeUndefined();
    });

    it('should throw 429 with RATE_LIMIT_ERROR when request rate exceeded', async () => {
      mockPrisma.loginAttempt.count.mockResolvedValue(10);
      mockPrisma.loginAttempt.findFirst.mockResolvedValue({
        attemptedAt: new Date(Date.now() - 30000),
      });

      try {
        await service.enforceRateLimit('192.168.1.1');
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(HttpException);
        const httpError = error as HttpException;
        expect(httpError.getStatus()).toBe(HttpStatus.TOO_MANY_REQUESTS);
        const response = httpError.getResponse() as Record<string, unknown>;
        expect(response.code).toBe('RATE_LIMIT_ERROR');
        expect(response.retryAfter).toBeGreaterThan(0);
      }
    });

    it('should throw 429 with lockout message when consecutive failures exceeded', async () => {
      mockPrisma.loginAttempt.count.mockResolvedValue(3); // Under request rate
      const now = new Date();
      const failures = Array.from({ length: 5 }, (_, i) => ({
        source: '192.168.1.1',
        success: false,
        attemptedAt: new Date(now.getTime() - i * 60000),
      }));
      mockPrisma.loginAttempt.findMany.mockResolvedValue(failures);

      try {
        await service.enforceRateLimit('192.168.1.1');
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(HttpException);
        const httpError = error as HttpException;
        expect(httpError.getStatus()).toBe(HttpStatus.TOO_MANY_REQUESTS);
        const response = httpError.getResponse() as Record<string, unknown>;
        expect(response.code).toBe('RATE_LIMIT_ERROR');
        expect(response.message).toContain('temporarily locked');
        expect(response.retryAfter).toBeGreaterThan(0);
      }
    });
  });
});
