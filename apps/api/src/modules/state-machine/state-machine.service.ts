import { Injectable, Logger } from '@nestjs/common';
import {
  CandidateStatus,
  TransitionMeta,
  VALID_TRANSITIONS,
  getValidTransitions,
  isValidTransition,
  isTerminalStatus,
} from '@rove-hire/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { Candidate } from '../../generated/prisma';

/**
 * Error codes returned by the state machine on failed transitions.
 */
export enum StateMachineErrorCode {
  INVALID_TRANSITION = 'INVALID_TRANSITION',
  PREREQUISITE_FAILED = 'PREREQUISITE_FAILED',
  CONFLICT_ERROR = 'CONFLICT_ERROR',
}

/**
 * Structured error thrown when a state machine transition fails.
 */
export interface StateMachineError {
  code: StateMachineErrorCode;
  currentStatus?: string;
  attemptedStatus?: string;
  validTransitions?: string[];
  message?: string;
}

/**
 * Result of executeTransition — either success with the updated candidate,
 * or failure with a structured error.
 */
export type TransitionResult =
  | { success: true; candidate: Candidate }
  | { success: false; error: StateMachineError };

/**
 * StateMachineService enforces the candidate pipeline state machine rules.
 * It validates transitions, checks prerequisites, and executes transitions
 * atomically using SELECT FOR UPDATE for optimistic locking.
 */
@Injectable()
export class StateMachineService {
  private readonly logger = new Logger(StateMachineService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Validates whether a transition from currentStatus to targetStatus is allowed
   * according to the state machine rules.
   */
  validateTransition(currentStatus: CandidateStatus, targetStatus: CandidateStatus): boolean {
    return isValidTransition(currentStatus, targetStatus);
  }

  /**
   * Returns the list of valid target statuses from the given status.
   */
  getValidTransitions(status: CandidateStatus): CandidateStatus[] {
    return getValidTransitions(status);
  }

  /**
   * Executes a candidate status transition atomically.
   *
   * Steps:
   * 1. Start a transaction
   * 2. SELECT FOR UPDATE on candidate row (pessimistic row-level locking)
   * 3. Validate the transition is allowed
   * 4. Check prerequisites (offer doc for Hired, reason for Rejected)
   * 5. Update candidate status, set lastActivityAt
   * 6. If Rejected: set rejectionReason
   * 7. Create timeline event
   * 8. Commit transaction
   *
   * @param candidateId - UUID of the candidate
   * @param targetStatus - The desired new status
   * @param meta - Additional metadata (rejectionReason for Rejected transitions)
   * @param userId - UUID of the HR user performing the transition
   */
  async executeTransition(
    candidateId: string,
    targetStatus: CandidateStatus,
    meta: TransitionMeta,
    userId: string,
  ): Promise<TransitionResult> {
    try {
      const candidate = await this.prisma.$transaction(
        async (tx) => {
          // Step 1: Lock the candidate row with SELECT FOR UPDATE
          const rows = await tx.$queryRaw<
            Array<{ id: string; status: string }>
          >`SELECT id, status FROM candidates WHERE id = ${candidateId} FOR UPDATE`;

          if (!rows || rows.length === 0) {
            throw new StateMachineException({
              code: StateMachineErrorCode.PREREQUISITE_FAILED,
              message: `Candidate with id ${candidateId} not found`,
            });
          }

          const currentStatus = rows[0].status as CandidateStatus;

          // Step 2: Validate transition is allowed
          if (!this.validateTransition(currentStatus, targetStatus)) {
            const valid = this.getValidTransitions(currentStatus);
            throw new StateMachineException({
              code: StateMachineErrorCode.INVALID_TRANSITION,
              currentStatus,
              attemptedStatus: targetStatus,
              validTransitions: valid,
            });
          }

          // Step 3: Check prerequisites
          if (targetStatus === CandidateStatus.Hired) {
            const offerDoc = await tx.document.findFirst({
              where: {
                candidateId,
                type: 'OfferLetter',
              },
            });

            if (!offerDoc) {
              throw new StateMachineException({
                code: StateMachineErrorCode.PREREQUISITE_FAILED,
                message:
                  'An offer letter document must exist before transitioning to Hired status',
              });
            }
          }

          if (targetStatus === CandidateStatus.Rejected) {
            const reason = meta?.rejectionReason;
            if (!reason || reason.length < 5 || reason.length > 500) {
              throw new StateMachineException({
                code: StateMachineErrorCode.PREREQUISITE_FAILED,
                message:
                  'A rejection reason between 5 and 500 characters is required',
              });
            }
          }

          // Step 4: Update candidate status
          const updateData: Record<string, unknown> = {
            status: targetStatus,
            lastActivityAt: new Date(),
          };

          if (targetStatus === CandidateStatus.Rejected && meta?.rejectionReason) {
            updateData.rejectionReason = meta.rejectionReason;
          }

          const updatedCandidate = await tx.candidate.update({
            where: { id: candidateId },
            data: updateData,
          });

          // Step 5: Create timeline event
          await tx.timelineEvent.create({
            data: {
              candidateId,
              eventType: 'status_change',
              previousStatus: currentStatus,
              newStatus: targetStatus,
              details:
                targetStatus === CandidateStatus.Rejected
                  ? meta?.rejectionReason
                  : null,
              ...(userId !== 'system' ? { actorId: userId } : {}),
            },
          });

          return updatedCandidate;
        },
        {
          maxWait: 5000,
          timeout: 10000,
        },
      );

      return { success: true, candidate };
    } catch (error) {
      // Handle our custom state machine errors
      if (error instanceof StateMachineException) {
        return { success: false, error: error.details };
      }

      // Handle Prisma-level conflict errors (e.g., row changed between SELECT and UPDATE)
      if (this.isPrismaConflictError(error)) {
        this.logger.warn(
          `Conflict error during transition for candidate ${candidateId}: ${(error as Error).message}`,
        );
        return {
          success: false,
          error: {
            code: StateMachineErrorCode.CONFLICT_ERROR,
            message:
              'The candidate record was modified by another process. Please retry the operation.',
          },
        };
      }

      // Re-throw unexpected errors
      this.logger.error(
        `Unexpected error during transition for candidate ${candidateId}`,
        (error as Error).stack,
      );
      throw error;
    }
  }

  /**
   * Checks if an error is a Prisma concurrency/conflict error.
   */
  private isPrismaConflictError(error: unknown): boolean {
    if (error && typeof error === 'object' && 'code' in error) {
      const prismaError = error as { code: string };
      // P2034 = Transaction failed due to a write conflict or a deadlock
      // P2025 = Record not found (could happen if row was deleted during transaction)
      return prismaError.code === 'P2034' || prismaError.code === 'P2025';
    }
    return false;
  }
}

/**
 * Internal exception used to communicate state machine errors
 * within the transaction callback. Caught by executeTransition
 * and converted to a structured error result.
 */
class StateMachineException extends Error {
  constructor(public readonly details: StateMachineError) {
    super(details.message ?? details.code);
    this.name = 'StateMachineException';
  }
}
