import { Injectable, Logger } from '@nestjs/common';
import type { TimelineEvent } from '../../generated/prisma';
import type { PrismaService } from '../../prisma/prisma.service';
import type { LogEventInput } from './dto/log-event.input';

/**
 * TimelineService records and retrieves chronological events for candidates.
 * Used by other modules (StateMachine, Interview, Document) to log actions.
 */
@Injectable()
export class TimelineService {
  private readonly logger = new Logger(TimelineService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Record a timeline event for a candidate.
   *
   * @param input - Event data including candidateId, eventType, optional statuses, details, and actorId
   * @returns The created TimelineEvent record
   */
  async logEvent(input: LogEventInput): Promise<TimelineEvent> {
    const { candidateId, eventType, previousStatus, newStatus, details, actorId } = input;

    this.logger.log(`Logging timeline event: type=${eventType} candidate=${candidateId}`);

    const event = await this.prisma.timelineEvent.create({
      data: {
        candidateId,
        eventType,
        previousStatus: previousStatus ?? null,
        newStatus: newStatus ?? null,
        details: details ?? null,
        actorId: actorId ?? null,
      },
    });

    return event;
  }

  /**
   * Retrieve timeline events for a candidate, ordered most-recent-first.
   *
   * @param candidateId - The candidate's ID
   * @param limit - Maximum number of events to return (default 50)
   * @returns Array of TimelineEvent records ordered by createdAt DESC
   */
  async findByCandidateId(candidateId: string, limit = 50): Promise<TimelineEvent[]> {
    return this.prisma.timelineEvent.findMany({
      where: { candidateId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }
}
