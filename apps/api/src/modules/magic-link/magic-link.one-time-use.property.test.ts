/**
 * Property 7: Magic Link — One-Time Use
 *
 * Property-based tests verifying that once a magic link token is consumed,
 * all subsequent validation and consumption attempts are rejected with
 * an "already used" indication, regardless of timing.
 *
 * - Generate token, consume it, attempt re-validation → returns { valid: false, reason: 'used' }
 * - Generate token, consume it, attempt re-consumption → throws ALREADY_CONSUMED error
 * - Timing after consumption does not affect the "used" response
 *
 * **Validates: Requirements 4.12, 5.5**
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  MagicLinkService,
  MagicLinkError,
  MagicLinkErrorCode,
  type ApplicationFormInput,
} from './magic-link.service';
import type { PrismaService } from '../../prisma/prisma.service';
import type { ConfigService } from '@nestjs/config';

interface MagicLinkRecord {
  id: string;
  tokenHash: string;
  candidateId: string;
  isConsumed: boolean;
  expiresAt: Date;
  consumedAt: Date | null;
  createdAt: Date;
}

/**
 * Creates a fresh service instance with its own in-memory store.
 * Each property test iteration gets a completely isolated instance.
 */
function createFreshService() {
  const store = new Map<string, MagicLinkRecord>();

  const findUniqueImpl = async (args: { where: { tokenHash: string } }) => {
    return store.get(args.where.tokenHash) ?? null;
  };

  const updateImpl = async (args: any) => {
    const { id, isConsumed: isConsumedCondition } = args.where;
    for (const [hash, rec] of store.entries()) {
      if (rec.id === id && rec.isConsumed === isConsumedCondition) {
        const updated: MagicLinkRecord = { ...rec, ...args.data } as MagicLinkRecord;
        store.set(hash, updated);
        return updated;
      }
    }
    throw new Error('Record not found or optimistic lock failed');
  };

  const prisma = {
    magicLink: {
      create: async (args: any) => {
        const record: MagicLinkRecord = {
          id: `link-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          tokenHash: args.data.tokenHash,
          candidateId: args.data.candidateId,
          isConsumed: args.data.isConsumed ?? false,
          expiresAt: args.data.expiresAt,
          consumedAt: null,
          createdAt: new Date(),
        };
        store.set(record.tokenHash, record);
        return record;
      },
      findUnique: findUniqueImpl,
    },
    $transaction: async (fn: (tx: any) => Promise<any>) => {
      const tx = {
        magicLink: {
          findUnique: findUniqueImpl,
          update: updateImpl,
        },
        candidate: {
          update: async (args: any) => ({
            id: args.where.id,
            ...args.data,
          }),
        },
      };
      return fn(tx);
    },
  };

  const configService = {
    get: (_key: string, defaultValue?: string) => defaultValue ?? 'http://localhost:3001',
  } as unknown as ConfigService;

  const service = new MagicLinkService(prisma as unknown as PrismaService, configService);

  return { service, store };
}

/**
 * Arbitrary: generates random valid application form data
 */
const formDataArbitrary: fc.Arbitrary<ApplicationFormInput> = fc.record({
  phone: fc.option(fc.string({ minLength: 7, maxLength: 20 }), { nil: undefined }),
  location: fc.option(fc.string({ minLength: 1, maxLength: 100 }), { nil: undefined }),
  currentRole: fc.option(fc.string({ minLength: 1, maxLength: 100 }), { nil: undefined }),
  noticePeriod: fc.option(fc.string({ minLength: 1, maxLength: 50 }), { nil: undefined }),
  salaryExpectation: fc.option(fc.string({ minLength: 1, maxLength: 50 }), { nil: undefined }),
  linkedinUrl: fc.option(fc.constant('https://www.linkedin.com/in/test-user'), { nil: undefined }),
});

/**
 * Arbitrary: generates a positive delay in milliseconds (0ms to 7 days)
 * to simulate various timings between consumption and re-validation
 */
const delayMsArbitrary = fc.integer({ min: 0, max: 7 * 24 * 60 * 60 * 1000 });

describe('Property 7: Magic Link — One-Time Use', () => {
  it('after consumption, validate() always returns { valid: false, reason: "used" }', async () => {
    await fc.assert(
      fc.asyncProperty(formDataArbitrary, async (formData) => {
        const { service } = createFreshService();

        // Generate a token
        const generated = await service.generate('candidate-1');

        // First validate should succeed (token exists, not consumed, not expired)
        const beforeConsume = await service.validate(generated.token);
        expect(beforeConsume.valid).toBe(true);
        expect(beforeConsume.candidateId).toBe('candidate-1');

        // Consume the token
        await service.consume(generated.token, formData);

        // After consumption, validate must return "used"
        const afterConsume = await service.validate(generated.token);
        expect(afterConsume.valid).toBe(false);
        expect(afterConsume.reason).toBe('used');
      }),
      { numRuns: 100 },
    );
  });

  it('after consumption, consume() always throws ALREADY_CONSUMED error', async () => {
    await fc.assert(
      fc.asyncProperty(formDataArbitrary, formDataArbitrary, async (formData1, formData2) => {
        const { service } = createFreshService();

        // Generate and consume a token
        const generated = await service.generate('candidate-1');
        await service.consume(generated.token, formData1);

        // Second consumption attempt must throw ALREADY_CONSUMED
        try {
          await service.consume(generated.token, formData2);
          expect.fail('Expected ALREADY_CONSUMED error but consume succeeded');
        } catch (error) {
          expect(error).toBeInstanceOf(MagicLinkError);
          expect((error as MagicLinkError).code).toBe(MagicLinkErrorCode.ALREADY_CONSUMED);
        }
      }),
      { numRuns: 100 },
    );
  });

  it('re-validation returns "used" regardless of elapsed time after consumption', async () => {
    await fc.assert(
      fc.asyncProperty(formDataArbitrary, delayMsArbitrary, async (formData, delayMs) => {
        const { service } = createFreshService();

        // Generate and consume a token
        const generated = await service.generate('candidate-1');
        await service.consume(generated.token, formData);

        // Simulate passage of time by temporarily overriding Date
        const RealDate = globalThis.Date;
        const futureTime = RealDate.now() + delayMs;

        class MockDate extends RealDate {
          constructor(...args: any[]) {
            if (args.length === 0) {
              super(futureTime);
            } else {
              // @ts-expect-error MockDate forwards constructor args to native Date
              super(...args);
            }
          }

          static override now() {
            return futureTime;
          }
        }

        globalThis.Date = MockDate as any;
        try {
          // Regardless of how much time passes, the token stays "used"
          // because isConsumed check happens before expiry check in the service
          const result = await service.validate(generated.token);
          expect(result.valid).toBe(false);
          expect(result.reason).toBe('used');
        } finally {
          globalThis.Date = RealDate;
        }
      }),
      { numRuns: 100 },
    );
  });

  it('multiple sequential re-validation attempts all return "used"', async () => {
    await fc.assert(
      fc.asyncProperty(
        formDataArbitrary,
        fc.integer({ min: 2, max: 10 }),
        async (formData, attempts) => {
          const { service } = createFreshService();

          // Generate and consume a token
          const generated = await service.generate('candidate-1');
          await service.consume(generated.token, formData);

          // All subsequent validation attempts must return "used"
          for (let i = 0; i < attempts; i++) {
            const result = await service.validate(generated.token);
            expect(result.valid).toBe(false);
            expect(result.reason).toBe('used');
          }
        },
      ),
      { numRuns: 50 },
    );
  });
});
