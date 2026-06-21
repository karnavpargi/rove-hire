/**
 * Property 5: Magic Link — Token Generation Entropy
 *
 * Property-based tests verifying that generated magic link tokens have
 * sufficient entropy (>= 43 chars URL-safe base64 of 256 bits) and that
 * the stored hash is a SHA-256 digest of the plaintext token (never the
 * plaintext itself).
 *
 * **Validates: Requirements 4.6, 20.1, 20.2**
 */

import { describe, it, expect, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { createHash } from 'crypto';
import { MagicLinkService } from './magic-link.service';
import { ConfigService } from '@nestjs/config';

/**
 * Minimum token length: base64url encoding of 32 bytes = 43 chars (no padding)
 */
const MIN_TOKEN_LENGTH = 43;

/**
 * URL-safe base64 character set: [A-Za-z0-9_-] (no +, /, or = padding)
 */
const URL_SAFE_BASE64_REGEX = /^[A-Za-z0-9_-]+$/;

describe('Property 5: Magic Link — Token Generation Entropy', () => {
  let service: MagicLinkService;
  /** Captures the tokenHash passed to prisma.magicLink.create in each call */
  let capturedHashes: string[];

  beforeEach(() => {
    capturedHashes = [];

    // Mock PrismaService — captures stored token hashes
    const mockPrisma = {
      magicLink: {
        create: async ({ data }: { data: { tokenHash: string; candidateId: string; expiresAt: Date; isConsumed: boolean } }) => {
          capturedHashes.push(data.tokenHash);
          return { id: `mock-id-${capturedHashes.length}`, ...data };
        },
      },
    } as any;

    const mockConfigService = {
      get: (key: string, defaultValue: string) => defaultValue,
    } as unknown as ConfigService;

    service = new MagicLinkService(mockPrisma, mockConfigService);
  });

  it('every generated token is >= 43 characters (URL-safe base64 of 256 bits)', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        async (candidateId) => {
          const result = await service.generate(candidateId);

          expect(result.token.length).toBeGreaterThanOrEqual(MIN_TOKEN_LENGTH);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('every generated token contains only URL-safe base64 characters', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        async (candidateId) => {
          const result = await service.generate(candidateId);

          expect(result.token).toMatch(URL_SAFE_BASE64_REGEX);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('stored hash is SHA-256 of the plaintext token', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        async (candidateId) => {
          const indexBefore = capturedHashes.length;
          const result = await service.generate(candidateId);

          // Compute expected hash from the returned plaintext token
          const expectedHash = createHash('sha256')
            .update(result.token)
            .digest('hex');

          // Verify the stored hash matches SHA-256 of the plaintext
          const storedHash = capturedHashes[indexBefore];
          expect(storedHash).toBe(expectedHash);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('stored hash never equals the plaintext token', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        async (candidateId) => {
          const indexBefore = capturedHashes.length;
          const result = await service.generate(candidateId);

          // The hash stored in the DB must NEVER be the plaintext token itself
          const storedHash = capturedHashes[indexBefore];
          expect(storedHash).not.toBe(result.token);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('multiple generated tokens are all unique (no collisions)', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 5, max: 20 }),
        async (count) => {
          const tokens: string[] = [];

          for (let i = 0; i < count; i++) {
            const result = await service.generate(`candidate-${i}`);
            tokens.push(result.token);
          }

          // All tokens should be unique
          const uniqueTokens = new Set(tokens);
          expect(uniqueTokens.size).toBe(tokens.length);
        },
      ),
      { numRuns: 50 },
    );
  });

  it('hashToken method produces consistent SHA-256 hex digest', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 100 }),
        (input) => {
          const hash1 = service.hashToken(input);
          const hash2 = service.hashToken(input);

          // Same input always produces same hash
          expect(hash1).toBe(hash2);

          // Hash is a valid hex string of 64 chars (SHA-256 = 256 bits = 64 hex)
          expect(hash1).toMatch(/^[a-f0-9]{64}$/);

          // Hash is never equal to the input
          expect(hash1).not.toBe(input);
        },
      ),
      { numRuns: 200 },
    );
  });
});
