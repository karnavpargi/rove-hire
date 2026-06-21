/**
 * Property 6: Magic Link — Hash Round-Trip Verification
 *
 * Property-based tests verifying that:
 * 1. SHA-256(plaintext token) === storedHash (round-trip consistency)
 * 2. The hashToken function produces deterministic, consistent 64-char hex output
 * 3. Random non-token strings don't accidentally match stored hashes (collision resistance)
 *
 * **Validates: Requirements 20.3, 20.4**
 */

import { describe, it, expect, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { createHash } from 'crypto';
import { MagicLinkService } from './magic-link.service';
import type { ConfigService } from '@nestjs/config';

describe('Property 6: Magic Link — Hash Round-Trip Verification', () => {
  let service: MagicLinkService;

  beforeEach(() => {
    const mockPrisma = {} as any;
    const mockConfigService = {
      get: (key: string, defaultValue: string) => defaultValue,
    } as unknown as ConfigService;
    service = new MagicLinkService(mockPrisma, mockConfigService);
  });

  /**
   * Arbitrary: URL-safe base64 tokens (simulating generated tokens)
   * Generated tokens are 32 random bytes encoded as base64url (43 chars)
   */
  const tokenArbitrary = fc
    .uint8Array({ minLength: 32, maxLength: 32 })
    .map((bytes) => Buffer.from(bytes).toString('base64url'));

  /**
   * Arbitrary: random strings of varying lengths (non-token inputs)
   */
  const randomStringArbitrary = fc.string({ minLength: 1, maxLength: 200 });

  /**
   * Arbitrary: random hex-like strings that could look like hashes (64-char hex)
   */
  const randomHexArbitrary = fc
    .array(fc.constantFrom(...'0123456789abcdef'.split('')), { minLength: 64, maxLength: 64 })
    .map((chars) => chars.join(''));

  it('SHA-256(token) === hashToken(token) for all generated tokens', () => {
    fc.assert(
      fc.property(tokenArbitrary, (token) => {
        const serviceHash = service.hashToken(token);
        const expectedHash = createHash('sha256').update(token).digest('hex');

        expect(serviceHash).toBe(expectedHash);
      }),
      { numRuns: 500 },
    );
  });

  it('hashToken produces consistent 64-char hex output for any input', () => {
    fc.assert(
      fc.property(randomStringArbitrary, (input) => {
        const hash = service.hashToken(input);

        // SHA-256 always produces 64 hex characters
        expect(hash).toHaveLength(64);
        // Must be valid hexadecimal
        expect(hash).toMatch(/^[0-9a-f]{64}$/);
      }),
      { numRuns: 500 },
    );
  });

  it('hashToken is deterministic — same input always produces same hash', () => {
    fc.assert(
      fc.property(tokenArbitrary, (token) => {
        const hash1 = service.hashToken(token);
        const hash2 = service.hashToken(token);

        expect(hash1).toBe(hash2);
      }),
      { numRuns: 300 },
    );
  });

  it('different tokens produce different hashes (collision resistance)', () => {
    fc.assert(
      fc.property(tokenArbitrary, tokenArbitrary, (tokenA, tokenB) => {
        // Skip when tokens are identical
        fc.pre(tokenA !== tokenB);

        const hashA = service.hashToken(tokenA);
        const hashB = service.hashToken(tokenB);

        expect(hashA).not.toBe(hashB);
      }),
      { numRuns: 500 },
    );
  });

  it('random non-token strings do not match any generated token hash', () => {
    fc.assert(
      fc.property(tokenArbitrary, randomStringArbitrary, (token, randomStr) => {
        // Skip when the random string happens to be the same as the token
        fc.pre(randomStr !== token);

        const storedHash = service.hashToken(token);
        const randomHash = service.hashToken(randomStr);

        // The hash of a random string must not match the stored hash of the token
        expect(randomHash).not.toBe(storedHash);
      }),
      { numRuns: 500 },
    );
  });

  it('random hex strings are not valid hashes of generated tokens', () => {
    fc.assert(
      fc.property(tokenArbitrary, randomHexArbitrary, (token, randomHex) => {
        const actualHash = service.hashToken(token);

        // A random 64-char hex string should never equal the actual hash
        // (probability is 1/2^256, effectively impossible)
        // We skip if by astronomically unlikely chance they match
        fc.pre(randomHex !== actualHash);

        expect(randomHex).not.toBe(actualHash);
      }),
      { numRuns: 300 },
    );
  });

  it('hash never equals the plaintext token', () => {
    fc.assert(
      fc.property(tokenArbitrary, (token) => {
        const hash = service.hashToken(token);

        // The stored hash must never be the plaintext token itself
        expect(hash).not.toBe(token);
      }),
      { numRuns: 300 },
    );
  });
});
