/**
 * Property 13: Authentication Error Opacity
 *
 * Property-based tests verifying that ALL invalid credential combinations
 * produce identical error responses — the system must not reveal whether
 * the email or password was incorrect.
 *
 * The key property: you cannot distinguish wrong-email from wrong-password
 * based on the error response (type, message, or structure).
 *
 * **Validates: Requirements 1.3**
 */

import { UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import * as fc from 'fast-check';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PrismaService } from '../../prisma/prisma.service';
import { asMock } from '../../test-utils/mock-types';
import { AuthService } from './auth.service';
import type { RateLimitService } from './rate-limit.service';

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

/**
 * Arbitrary for valid-looking email addresses that pass input validation.
 */
const validEmailArb = fc
  .tuple(
    fc.stringMatching(/^[a-z][a-z0-9]{2,10}$/),
    fc.stringMatching(/^[a-z][a-z0-9]{2,8}$/),
    fc.constantFrom('com', 'org', 'net', 'io'),
  )
  .map(([local, domain, tld]) => `${local}@${domain}.${tld}`);

/**
 * Arbitrary for passwords that pass input validation (8-128 chars).
 */
const validPasswordArb = fc.string({ minLength: 8, maxLength: 64 }).filter((s) => s.length >= 8);

describe('Property 13: Authentication Error Opacity', () => {
  let service: AuthService;
  const existingUserEmail = 'existing@rove.com';
  const existingUserPassword = 'CorrectPass1';
  let existingUserHash: string;

  beforeEach(async () => {
    vi.resetAllMocks();
    mockRateLimitService.trackLoginAttempt.mockResolvedValue(undefined);
    process.env.JWT_SECRET = 'test-secret-key-for-testing-purposes';
    service = new AuthService(
      asMock<PrismaService>(mockPrisma),
      asMock<RateLimitService>(mockRateLimitService),
    );
    existingUserHash = await bcrypt.hash(existingUserPassword, 4); // Lower cost for test speed
  });

  /**
   * Core opacity property: For any invalid credential combination,
   * the error response must be identical regardless of failure reason.
   *
   * Three failure scenarios:
   * 1. Valid email + wrong password → user found, bcrypt mismatch
   * 2. Invalid email + any password → user not found
   * 3. Invalid email + invalid password → user not found
   *
   * All three MUST produce the same error type, message, and structure.
   */
  it('wrong email and wrong password produce identical error type (UnauthorizedException)', () => {
    fc.assert(
      fc.asyncProperty(validEmailArb, validPasswordArb, async (randomEmail, randomPassword) => {
        // Scenario 1: Email not found (unknown email)
        mockPrisma.hrUser.findUnique.mockResolvedValueOnce(null);

        let errorWrongEmail: UnauthorizedException | undefined;
        try {
          await service.login(randomEmail, randomPassword);
        } catch (e) {
          errorWrongEmail = e as UnauthorizedException;
        }

        // Scenario 2: Email found but wrong password
        mockPrisma.hrUser.findUnique.mockResolvedValueOnce({
          id: 'user-123',
          email: existingUserEmail,
          name: 'HR Admin',
          passwordHash: existingUserHash,
        });

        let errorWrongPassword: UnauthorizedException | undefined;
        try {
          await service.login(existingUserEmail, randomPassword);
        } catch (e) {
          errorWrongPassword = e as UnauthorizedException;
        }

        // Both must throw UnauthorizedException
        expect(errorWrongEmail).toBeInstanceOf(UnauthorizedException);
        expect(errorWrongPassword).toBeInstanceOf(UnauthorizedException);
      }),
      { numRuns: 30 },
    );
  });

  it('wrong email and wrong password produce identical error message', () => {
    fc.assert(
      fc.asyncProperty(validEmailArb, validPasswordArb, async (randomEmail, randomPassword) => {
        // Scenario 1: Email not found
        mockPrisma.hrUser.findUnique.mockResolvedValueOnce(null);

        let errorWrongEmail: UnauthorizedException | undefined;
        try {
          await service.login(randomEmail, randomPassword);
        } catch (e) {
          errorWrongEmail = e as UnauthorizedException;
        }

        // Scenario 2: Email found but wrong password
        mockPrisma.hrUser.findUnique.mockResolvedValueOnce({
          id: 'user-456',
          email: existingUserEmail,
          name: 'HR Admin',
          passwordHash: existingUserHash,
        });

        let errorWrongPassword: UnauthorizedException | undefined;
        try {
          await service.login(existingUserEmail, randomPassword);
        } catch (e) {
          errorWrongPassword = e as UnauthorizedException;
        }

        // Error messages must be identical — no information leakage
        expect(errorWrongEmail.message).toBe(errorWrongPassword.message);
        expect(errorWrongEmail.message).toBe('Invalid email or password');
      }),
      { numRuns: 30 },
    );
  });

  it('error response structure is identical for all invalid credential scenarios', () => {
    fc.assert(
      fc.asyncProperty(validEmailArb, validPasswordArb, async (randomEmail, randomPassword) => {
        // Scenario 1: Email not found (nonexistent user)
        mockPrisma.hrUser.findUnique.mockResolvedValueOnce(null);

        let errorNoUser: UnauthorizedException | undefined;
        try {
          await service.login(randomEmail, randomPassword);
        } catch (e) {
          errorNoUser = e as UnauthorizedException;
        }

        // Scenario 2: Email found, wrong password
        mockPrisma.hrUser.findUnique.mockResolvedValueOnce({
          id: 'user-789',
          email: existingUserEmail,
          name: 'HR Admin',
          passwordHash: existingUserHash,
        });

        let errorBadPass: UnauthorizedException | undefined;
        try {
          await service.login(existingUserEmail, randomPassword);
        } catch (e) {
          errorBadPass = e as UnauthorizedException;
        }

        // Scenario 3: Both email and password wrong (still user not found)
        mockPrisma.hrUser.findUnique.mockResolvedValueOnce(null);

        let errorBothWrong: UnauthorizedException | undefined;
        try {
          await service.login(randomEmail, randomPassword);
        } catch (e) {
          errorBothWrong = e as UnauthorizedException;
        }

        // All three must have identical error structure
        // Same constructor name
        expect(errorNoUser.constructor.name).toBe(errorBadPass.constructor.name);
        expect(errorBadPass.constructor.name).toBe(errorBothWrong.constructor.name);

        // Same message
        expect(errorNoUser.message).toBe(errorBadPass.message);
        expect(errorBadPass.message).toBe(errorBothWrong.message);

        // Same HTTP status code
        expect(errorNoUser.getStatus()).toBe(errorBadPass.getStatus());
        expect(errorBadPass.getStatus()).toBe(errorBothWrong.getStatus());
        expect(errorNoUser.getStatus()).toBe(401);

        // Same response body keys (no extra fields that leak info)
        const keysNoUser = Object.keys(errorNoUser.getResponse()).sort();
        const keysBadPass = Object.keys(errorBadPass.getResponse()).sort();
        const keysBothWrong = Object.keys(errorBothWrong.getResponse()).sort();

        expect(keysNoUser).toEqual(keysBadPass);
        expect(keysBadPass).toEqual(keysBothWrong);
      }),
      { numRuns: 20 },
    );
  });

  it('error does not contain any field indicating which credential was wrong', () => {
    fc.assert(
      fc.asyncProperty(validEmailArb, validPasswordArb, async (randomEmail, randomPassword) => {
        // Test with non-existent email
        mockPrisma.hrUser.findUnique.mockResolvedValueOnce(null);

        let error: UnauthorizedException | undefined;
        try {
          await service.login(randomEmail, randomPassword);
        } catch (e) {
          error = e as UnauthorizedException;
        }

        expect(error).toBeInstanceOf(UnauthorizedException);

        // The error response should NOT contain fields that reveal failure cause
        const response = error.getResponse();
        const responseStr = JSON.stringify(response).toLowerCase();

        // Should not mention "email" or "password" as the specific failing field
        expect(responseStr).not.toContain('"field"');
        expect(responseStr).not.toContain('"email_not_found"');
        expect(responseStr).not.toContain('"password_incorrect"');
        expect(responseStr).not.toContain('"user_not_found"');
      }),
      { numRuns: 20 },
    );
  });
});
