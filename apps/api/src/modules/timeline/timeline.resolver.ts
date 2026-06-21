import { Args, Int, Query, Resolver } from '@nestjs/graphql';
import { TimelineEventType } from './timeline.model';
import type { TimelineService } from './timeline.service';

/**
 * TimelineResolver exposes GraphQL queries for candidate timeline events.
 *
 * Queries:
 * - timelineEvents(candidateId, limit?): Retrieve chronological events for a candidate
 *
 * Protected by the global JwtAuthGuard (APP_GUARD).
 *
 * Requirements: 7.2, 9.5, 10.4
 */
@Resolver(() => TimelineEventType)
export class TimelineResolver {
  constructor(private readonly timelineService: TimelineService) {}

  /**
   * Retrieve timeline events for a candidate, ordered most-recent-first.
   * Default limit: 50 events.
   *
   * Requirements: 7.2
   */
  @Query(() => [TimelineEventType], {
    description: 'Get timeline events for a candidate (most recent first)',
  })
  async timelineEvents(
    @Args('candidateId', { description: 'ID of the candidate to fetch events for' })
    candidateId: string,
    @Args('limit', {
      type: () => Int,
      nullable: true,
      description: 'Max events to return (default 50)',
    })
    limit?: number,
  ): Promise<TimelineEventType[]> {
    const events = await this.timelineService.findByCandidateId(candidateId, limit ?? 50);

    return events.map((event) => ({
      id: event.id,
      candidateId: event.candidateId,
      eventType: event.eventType,
      previousStatus: event.previousStatus,
      newStatus: event.newStatus,
      details: event.details,
      actorId: event.actorId,
      createdAt: event.createdAt,
    }));
  }
}
