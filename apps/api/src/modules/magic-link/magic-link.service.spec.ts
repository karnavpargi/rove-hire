import type { ConfigService } from '@nestjs/config';
import { createHash, randomBytes } from 'crypto';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PrismaService } from '../../prisma/prisma.service';
import type { TransactionCallback } from '../../test-utils/mock-types';
import { MagicLinkError, MagicLinkErrorCode, MagicLinkService } from './magic-link.service';

// Mock PrismaService
function createMockPrisma() {
  const txMagicLink = {
    findUnique: vi.fn(),
    update: vi.fn(),
  };
  const txCandidate = {
    update: vi.fn(),
  };
  const tx = {
    magicLink: txMagicLink,
    candidate: txCandidate,
  };

  return {
    magicLink: {
      create: vi.fn(),
      findUnique: vi.fn(),
    },
    $transaction: vi.fn(async (fn: TransactionCallback) => {
      return fn(tx);
    }),
    _tx: tx,
    _txMagicLink: txMagicLink,
    _txCandidate: txCandidate,
  };
}

function createConfigService(): ConfigService {
  return {
    get: vi.fn((key: string, defaultValue?: string) => {
      const config: Record<string, string> = {
        FRONTEND_URL: 'http://localhost:3001',
      };
      return config[key] ?? defaultValue;
    }),
  } as unknown as ConfigService;
}

describe('MagicLinkService', () => {
  let service: MagicLinkService;
  let mockPrisma: ReturnType<typeof createMockPrisma>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma = createMockPrisma();
    service = new MagicLinkService(mockPrisma as unknown as PrismaService, createConfigService());
  });

  describe('generate', () => {
    it('should generate a token with 43+ characters (256-bit base64url)', async () => {
      mockPrisma.magicLink.create.mockResolvedValue({
        id: 'link-id',
        tokenHash: 'hash',
        candidateId: 'candidate-1',
        isConsumed: false,
        expiresAt: new Date(),
        consumedAt: null,
        createdAt: new Date(),
      });

      const result = await service.generate('candidate-1');

      // base64url of 32 bytes = 43 chars (no padding)
      expect(result.token.length).toBeGreaterThanOrEqual(43);
    });

    it('should store SHA-256 hash, not plaintext token', async () => {
      mockPrisma.magicLink.create.mockResolvedValue({
        id: 'link-id',
        tokenHash: 'stored-hash',
        candidateId: 'candidate-1',
        isConsumed: false,
        expiresAt: new Date(),
        consumedAt: null,
        createdAt: new Date(),
      });

      const result = await service.generate('candidate-1');
      const expectedHash = createHash('sha256').update(result.token).digest('hex');

      // Verify the hash passed to create matches SHA-256 of the token
      expect(mockPrisma.magicLink.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            tokenHash: expectedHash,
          }),
        }),
      );

      // Stored hash must NOT be the plaintext
      const callArgs = mockPrisma.magicLink.create.mock.calls[0][0];
      expect(callArgs.data.tokenHash).not.toBe(result.token);
    });

    it('should set expiry to 14 days from creation', async () => {
      mockPrisma.magicLink.create.mockResolvedValue({
        id: 'link-id',
        tokenHash: 'hash',
        candidateId: 'candidate-1',
        isConsumed: false,
        expiresAt: new Date(),
        consumedAt: null,
        createdAt: new Date(),
      });

      const before = Date.now();
      const result = await service.generate('candidate-1');
      const after = Date.now();

      const fourteenDaysMs = 14 * 24 * 60 * 60 * 1000;
      const expiryTime = result.expiresAt.getTime();

      expect(expiryTime).toBeGreaterThanOrEqual(before + fourteenDaysMs);
      expect(expiryTime).toBeLessThanOrEqual(after + fourteenDaysMs);
    });

    it('should return a full URL with the token', async () => {
      mockPrisma.magicLink.create.mockResolvedValue({
        id: 'link-id',
        tokenHash: 'hash',
        candidateId: 'candidate-1',
        isConsumed: false,
        expiresAt: new Date(),
        consumedAt: null,
        createdAt: new Date(),
      });

      const result = await service.generate('candidate-1');

      expect(result.url).toBe(`http://localhost:3001/candidate-application/${result.token}`);
    });

    it('should generate unique tokens on consecutive calls', async () => {
      mockPrisma.magicLink.create.mockResolvedValue({
        id: 'link-id',
        tokenHash: 'hash',
        candidateId: 'candidate-1',
        isConsumed: false,
        expiresAt: new Date(),
        consumedAt: null,
        createdAt: new Date(),
      });

      const result1 = await service.generate('candidate-1');
      const result2 = await service.generate('candidate-1');

      expect(result1.token).not.toBe(result2.token);
    });

    it('should throw MagicLinkError on database failure', async () => {
      mockPrisma.magicLink.create.mockRejectedValue(new Error('Database connection lost'));

      await expect(service.generate('candidate-1')).rejects.toThrow(MagicLinkError);
      await expect(service.generate('candidate-1')).rejects.toMatchObject({
        code: MagicLinkErrorCode.GENERATION_FAILED,
      });
    });
  });

  describe('validate', () => {
    it('should return valid=true with candidateId for a valid token', async () => {
      const token = randomBytes(32).toString('base64url');
      const tokenHash = createHash('sha256').update(token).digest('hex');

      mockPrisma.magicLink.findUnique.mockResolvedValue({
        id: 'link-id',
        tokenHash,
        candidateId: 'candidate-1',
        isConsumed: false,
        expiresAt: new Date(Date.now() + 1000 * 60 * 60), // 1 hour from now
        consumedAt: null,
        createdAt: new Date(),
      });

      const result = await service.validate(token);

      expect(result).toEqual({ valid: true, candidateId: 'candidate-1' });
    });

    it('should return invalid reason for non-existent token', async () => {
      mockPrisma.magicLink.findUnique.mockResolvedValue(null);

      const result = await service.validate('non-existent-token');

      expect(result).toEqual({ valid: false, reason: 'invalid' });
    });

    it('should return used reason for consumed token', async () => {
      const token = randomBytes(32).toString('base64url');
      const tokenHash = createHash('sha256').update(token).digest('hex');

      mockPrisma.magicLink.findUnique.mockResolvedValue({
        id: 'link-id',
        tokenHash,
        candidateId: 'candidate-1',
        isConsumed: true,
        expiresAt: new Date(Date.now() + 1000 * 60 * 60),
        consumedAt: new Date(),
        createdAt: new Date(),
      });

      const result = await service.validate(token);

      expect(result).toEqual({ valid: false, reason: 'used' });
    });

    it('should return expired reason for expired token', async () => {
      const token = randomBytes(32).toString('base64url');
      const tokenHash = createHash('sha256').update(token).digest('hex');

      mockPrisma.magicLink.findUnique.mockResolvedValue({
        id: 'link-id',
        tokenHash,
        candidateId: 'candidate-1',
        isConsumed: false,
        expiresAt: new Date(Date.now() - 1000), // Expired 1 second ago
        consumedAt: null,
        createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000), // 15 days ago
      });

      const result = await service.validate(token);

      expect(result).toEqual({ valid: false, reason: 'expired' });
    });

    it('should check consumed status before expiry', async () => {
      const token = randomBytes(32).toString('base64url');
      const tokenHash = createHash('sha256').update(token).digest('hex');

      // Token that is both consumed AND expired
      mockPrisma.magicLink.findUnique.mockResolvedValue({
        id: 'link-id',
        tokenHash,
        candidateId: 'candidate-1',
        isConsumed: true,
        expiresAt: new Date(Date.now() - 1000), // Expired
        consumedAt: new Date(),
        createdAt: new Date(),
      });

      const result = await service.validate(token);

      // "used" takes priority over "expired"
      expect(result).toEqual({ valid: false, reason: 'used' });
    });

    it('should hash the token before looking up', async () => {
      const token = 'my-test-token';
      const expectedHash = createHash('sha256').update(token).digest('hex');

      mockPrisma.magicLink.findUnique.mockResolvedValue(null);

      await service.validate(token);

      expect(mockPrisma.magicLink.findUnique).toHaveBeenCalledWith({
        where: { tokenHash: expectedHash },
      });
    });
  });

  describe('consume', () => {
    it('should mark token as consumed and update candidate in one transaction', async () => {
      const token = randomBytes(32).toString('base64url');
      const tokenHash = createHash('sha256').update(token).digest('hex');

      const magicLinkRecord = {
        id: 'link-id',
        tokenHash,
        candidateId: 'candidate-1',
        isConsumed: false,
        expiresAt: new Date(Date.now() + 1000 * 60 * 60),
        consumedAt: null,
        createdAt: new Date(),
      };

      mockPrisma._txMagicLink.findUnique.mockResolvedValue(magicLinkRecord);
      mockPrisma._txMagicLink.update.mockResolvedValue({
        ...magicLinkRecord,
        isConsumed: true,
        consumedAt: new Date(),
      });
      mockPrisma._txCandidate.update.mockResolvedValue({
        id: 'candidate-1',
        status: 'FormSubmitted',
        phone: '555-1234',
        location: 'New York',
      });

      const formData = {
        phone: '555-1234',
        location: 'New York',
        currentRole: 'Engineer',
        noticePeriod: '2 weeks',
        salaryExpectation: '$100,000',
        linkedinUrl: 'https://www.linkedin.com/in/test',
      };

      const result = await service.consume(token, formData);

      expect(result).toMatchObject({
        id: 'candidate-1',
        status: 'FormSubmitted',
      });

      // Verify magic link was marked consumed
      expect(mockPrisma._txMagicLink.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            id: 'link-id',
            isConsumed: false,
          }),
          data: expect.objectContaining({
            isConsumed: true,
          }),
        }),
      );

      // Verify candidate was updated with form data
      expect(mockPrisma._txCandidate.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'candidate-1' },
          data: expect.objectContaining({
            phone: '555-1234',
            location: 'New York',
            currentRole: 'Engineer',
            noticePeriod: '2 weeks',
            salaryExpectation: '$100,000',
            linkedinUrl: 'https://www.linkedin.com/in/test',
            status: 'FormSubmitted',
          }),
        }),
      );
    });

    it('should throw INVALID_TOKEN for non-existent token', async () => {
      mockPrisma._txMagicLink.findUnique.mockResolvedValue(null);

      await expect(service.consume('non-existent', { phone: '555-0000' })).rejects.toMatchObject({
        code: MagicLinkErrorCode.INVALID_TOKEN,
      });
    });

    it('should throw ALREADY_CONSUMED for used token', async () => {
      const token = randomBytes(32).toString('base64url');
      const tokenHash = createHash('sha256').update(token).digest('hex');

      mockPrisma._txMagicLink.findUnique.mockResolvedValue({
        id: 'link-id',
        tokenHash,
        candidateId: 'candidate-1',
        isConsumed: true,
        expiresAt: new Date(Date.now() + 1000 * 60 * 60),
        consumedAt: new Date(),
        createdAt: new Date(),
      });

      await expect(service.consume(token, { phone: '555-0000' })).rejects.toMatchObject({
        code: MagicLinkErrorCode.ALREADY_CONSUMED,
      });
    });

    it('should throw EXPIRED for expired token', async () => {
      const token = randomBytes(32).toString('base64url');
      const tokenHash = createHash('sha256').update(token).digest('hex');

      mockPrisma._txMagicLink.findUnique.mockResolvedValue({
        id: 'link-id',
        tokenHash,
        candidateId: 'candidate-1',
        isConsumed: false,
        expiresAt: new Date(Date.now() - 1000),
        consumedAt: null,
        createdAt: new Date(),
      });

      await expect(service.consume(token, { phone: '555-0000' })).rejects.toMatchObject({
        code: MagicLinkErrorCode.EXPIRED,
      });
    });

    it('should handle optional form fields (null when not provided)', async () => {
      const token = randomBytes(32).toString('base64url');
      const tokenHash = createHash('sha256').update(token).digest('hex');

      mockPrisma._txMagicLink.findUnique.mockResolvedValue({
        id: 'link-id',
        tokenHash,
        candidateId: 'candidate-1',
        isConsumed: false,
        expiresAt: new Date(Date.now() + 1000 * 60 * 60),
        consumedAt: null,
        createdAt: new Date(),
      });
      mockPrisma._txMagicLink.update.mockResolvedValue({});
      mockPrisma._txCandidate.update.mockResolvedValue({
        id: 'candidate-1',
        status: 'FormSubmitted',
      });

      // Only provide phone, leave everything else undefined
      await service.consume(token, { phone: '555-0000' });

      expect(mockPrisma._txCandidate.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            phone: '555-0000',
            location: null,
            currentRole: null,
            noticePeriod: null,
            salaryExpectation: null,
            linkedinUrl: null,
          }),
        }),
      );
    });

    it('should wrap unexpected errors as CONSUMPTION_FAILED', async () => {
      mockPrisma.$transaction.mockRejectedValue(new Error('Database crash'));

      await expect(service.consume('some-token', { phone: '555-0000' })).rejects.toMatchObject({
        code: MagicLinkErrorCode.CONSUMPTION_FAILED,
      });
    });
  });

  describe('hashToken', () => {
    it('should return SHA-256 hex digest', () => {
      const token = 'test-token-123';
      const expected = createHash('sha256').update(token).digest('hex');

      expect(service.hashToken(token)).toBe(expected);
    });

    it('should produce consistent hashes for same input', () => {
      const token = 'consistent-token';
      const hash1 = service.hashToken(token);
      const hash2 = service.hashToken(token);

      expect(hash1).toBe(hash2);
    });

    it('should produce different hashes for different inputs', () => {
      const hash1 = service.hashToken('token-a');
      const hash2 = service.hashToken('token-b');

      expect(hash1).not.toBe(hash2);
    });

    it('should return a 64-char hex string (SHA-256)', () => {
      const hash = service.hashToken('any-token');

      expect(hash).toHaveLength(64);
      expect(hash).toMatch(/^[0-9a-f]{64}$/);
    });
  });
});
