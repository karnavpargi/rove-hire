import type { ExecutionContext } from '@nestjs/common';
import type { JwtPayload } from '../modules/auth/auth.service';

import type { Mock } from 'vitest';

/** Cast a partial mock to a concrete type without using `any`. */
export function asMock<T>(mock: Record<string, unknown>): T {
  return mock as unknown as T;
}

/** Prisma transaction callback used in unit/property tests. */
export type TransactionCallback = (tx: Record<string, unknown>) => Promise<unknown>;

export interface PrismaConflictError extends Error {
  code?: string;
}

export function createPrismaConflictError(
  message = 'Transaction failed due to a write conflict or a deadlock. Please retry your transaction',
): PrismaConflictError {
  const error = new Error(message) as PrismaConflictError;
  error.code = 'P2034';
  return error;
}

export interface TestTrackedResponse {
  _statusCode?: number;
}

export interface GraphQlErrorBody {
  errors: Array<{
    message: string;
    extensions: { code: string };
  }>;
}

export interface GqlTestRequest {
  cookies: Record<string, string>;
  ip: string;
  user?: JwtPayload;
}

export interface GqlTestExecutionContext extends ExecutionContext {
  __gqlContext: { req: GqlTestRequest };
}

export interface MockPrismaTransaction {
  $transaction: Mock<(fn: TransactionCallback) => Promise<unknown>>;
}
