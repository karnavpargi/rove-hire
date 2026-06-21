import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TimelineService } from '../timeline.service';
import { TimelineEventType } from '@rove-hire/shared';
import type { PrismaService } from '../../../prisma/prisma.service';

/**
 * Unit tests for TimelineService
 * Validates: Requirements 7.2, 9.5, 10.4
 */

function createMockPrisma() {
  return {
    timelineEvent: {
      create: vi.fn(),
      findMany: vi.fn(),
    },
  } as unknown as PrismaService;
}

describe('TimelineService', () => {
  let service: TimelineService;
  let prisma: ReturnType<typeof createMockPrisma>;

  beforeEach(() => {
    prisma = createMockPrisma();
    service = new TimelineService(prisma);
  });

  describe('logEvent', () => {
    it('should create a timeline event with all fields', async () => {
      const mockEvent = {
        id: 'evt-1',
        candidateId: 'cand-1',
        eventType: TimelineEventType.StatusChange,
        previousStatus: 'Applied',
        newStatus: 'FormSubmitted',
        details: JSON.stringify({ reason: 'Form submitted by candidate' }),
        actorId: 'user-1',
        createdAt: new Date(),
      };

      (prisma.timelineEvent.create as ReturnType<typeof vi.fn>).mockResolvedValue(mockEvent);

      const result = await service.logEvent({
        candidateId: 'cand-1',
        eventType: TimelineEventType.StatusChange,
        previousStatus: 'Applied',
        newStatus: 'FormSubmitted',
        details: JSON.stringify({ reason: 'Form submitted by candidate' }),
        actorId: 'user-1',
      });

      expect(prisma.timelineEvent.create).toHaveBeenCalledWith({
        data: {
          candidateId: 'cand-1',
          eventType: 'status_change',
          previousStatus: 'Applied',
          newStatus: 'FormSubmitted',
          details: JSON.stringify({ reason: 'Form submitted by candidate' }),
          actorId: 'user-1',
        },
      });
      expect(result).toEqual(mockEvent);
    });

    it('should handle optional fields as null', async () => {
      const mockEvent = {
        id: 'evt-2',
        candidateId: 'cand-2',
        eventType: TimelineEventType.ApplicationSubmitted,
        previousStatus: null,
        newStatus: null,
        details: null,
        actorId: null,
        createdAt: new Date(),
      };

      (prisma.timelineEvent.create as ReturnType<typeof vi.fn>).mockResolvedValue(mockEvent);

      const result = await service.logEvent({
        candidateId: 'cand-2',
        eventType: TimelineEventType.ApplicationSubmitted,
      });

      expect(prisma.timelineEvent.create).toHaveBeenCalledWith({
        data: {
          candidateId: 'cand-2',
          eventType: 'application_submitted',
          previousStatus: null,
          newStatus: null,
          details: null,
          actorId: null,
        },
      });
      expect(result).toEqual(mockEvent);
    });

    it('should support all timeline event types', async () => {
      const eventTypes = [
        TimelineEventType.StatusChange,
        TimelineEventType.InterviewScheduled,
        TimelineEventType.FeedbackSubmitted,
        TimelineEventType.OfferGenerated,
        TimelineEventType.RejectionRecorded,
        TimelineEventType.ApplicationSubmitted,
      ];

      for (const eventType of eventTypes) {
        (prisma.timelineEvent.create as ReturnType<typeof vi.fn>).mockResolvedValue({
          id: 'evt-x',
          candidateId: 'cand-1',
          eventType,
          previousStatus: null,
          newStatus: null,
          details: null,
          actorId: null,
          createdAt: new Date(),
        });

        await service.logEvent({ candidateId: 'cand-1', eventType });

        expect(prisma.timelineEvent.create).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({ eventType }),
          }),
        );
      }
    });

    it('should store metadata as details string (JSON)', async () => {
      const metadata = {
        previous_status: 'InterviewScheduled',
        new_status: 'OfferSent',
        reason: 'Passed technical interview',
      };

      (prisma.timelineEvent.create as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'evt-3',
        candidateId: 'cand-1',
        eventType: TimelineEventType.OfferGenerated,
        previousStatus: 'InterviewScheduled',
        newStatus: 'OfferSent',
        details: JSON.stringify(metadata),
        actorId: 'user-1',
        createdAt: new Date(),
      });

      const result = await service.logEvent({
        candidateId: 'cand-1',
        eventType: TimelineEventType.OfferGenerated,
        previousStatus: 'InterviewScheduled',
        newStatus: 'OfferSent',
        details: JSON.stringify(metadata),
        actorId: 'user-1',
      });

      expect(result.details).toBe(JSON.stringify(metadata));
    });
  });

  describe('findByCandidateId', () => {
    it('should return events ordered by createdAt DESC with default limit of 50', async () => {
      const mockEvents = [
        { id: 'evt-2', candidateId: 'cand-1', eventType: 'status_change', createdAt: new Date('2024-02-01') },
        { id: 'evt-1', candidateId: 'cand-1', eventType: 'application_submitted', createdAt: new Date('2024-01-01') },
      ];

      (prisma.timelineEvent.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(mockEvents);

      const result = await service.findByCandidateId('cand-1');

      expect(prisma.timelineEvent.findMany).toHaveBeenCalledWith({
        where: { candidateId: 'cand-1' },
        orderBy: { createdAt: 'desc' },
        take: 50,
      });
      expect(result).toEqual(mockEvents);
    });

    it('should respect custom limit parameter', async () => {
      (prisma.timelineEvent.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);

      await service.findByCandidateId('cand-1', 10);

      expect(prisma.timelineEvent.findMany).toHaveBeenCalledWith({
        where: { candidateId: 'cand-1' },
        orderBy: { createdAt: 'desc' },
        take: 10,
      });
    });

    it('should return empty array when no events exist', async () => {
      (prisma.timelineEvent.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);

      const result = await service.findByCandidateId('cand-nonexistent');

      expect(result).toEqual([]);
    });
  });
});
