import { BadRequestException, NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PrismaService } from '../../prisma/prisma.service';
import { asMock } from '../../test-utils/mock-types';
import type { TimelineService } from '../timeline/timeline.service';
import { InterviewStatusGql, InterviewTypeGql, RecommendationGql } from './interview.model';
import { InterviewService } from './interview.service';

/**
 * Unit tests for InterviewService.
 * Validates: Requirements 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8, 6.9
 */

// Mock PrismaService
const mockPrisma = {
  interview: {
    create: vi.fn(),
    findMany: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  candidate: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
};

// Mock TimelineService
const mockTimelineService = {
  logEvent: vi.fn(),
};

describe('InterviewService', () => {
  let service: InterviewService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new InterviewService(
      asMock<PrismaService>(mockPrisma),
      asMock<TimelineService>(mockTimelineService),
    );
  });

  describe('schedule', () => {
    const futureDate = new Date(Date.now() + 86400000).toISOString(); // tomorrow

    const validInput = {
      candidateId: 'cand-1',
      type: InterviewTypeGql.Screening,
      scheduledAt: futureDate,
      interviewerName: 'John Smith',
      notes: 'Initial screening call',
    };

    it('should schedule an interview and transition FormSubmitted to InterviewScheduled', async () => {
      mockPrisma.candidate.findUnique.mockResolvedValue({
        id: 'cand-1',
        status: 'FormSubmitted',
      });

      mockPrisma.interview.create.mockResolvedValue({
        id: 'int-1',
        candidateId: 'cand-1',
        type: 'Screening',
        scheduledAt: new Date(futureDate),
        interviewerName: 'John Smith',
        notes: 'Initial screening call',
        status: 'Scheduled',
        recommendation: null,
        feedback: null,
        completedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      mockPrisma.candidate.update.mockResolvedValue({ id: 'cand-1', status: 'InterviewScheduled' });
      mockTimelineService.logEvent.mockResolvedValue({});

      const result = await service.schedule(validInput);

      expect(result.id).toBe('int-1');
      expect(result.status).toBe('Scheduled');
      expect(mockPrisma.candidate.update).toHaveBeenCalledWith({
        where: { id: 'cand-1' },
        data: {
          status: 'InterviewScheduled',
          lastActivityAt: expect.any(Date),
        },
      });
      expect(mockTimelineService.logEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          candidateId: 'cand-1',
          eventType: 'interview_scheduled',
        }),
      );
    });

    it('should keep InterviewScheduled status if candidate already has that status', async () => {
      mockPrisma.candidate.findUnique.mockResolvedValue({
        id: 'cand-1',
        status: 'InterviewScheduled',
      });

      mockPrisma.interview.create.mockResolvedValue({
        id: 'int-2',
        candidateId: 'cand-1',
        type: 'Technical',
        scheduledAt: new Date(futureDate),
        interviewerName: 'Jane Doe',
        notes: null,
        status: 'Scheduled',
        recommendation: null,
        feedback: null,
        completedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      mockPrisma.candidate.update.mockResolvedValue({ id: 'cand-1', status: 'InterviewScheduled' });
      mockTimelineService.logEvent.mockResolvedValue({});

      const result = await service.schedule({
        ...validInput,
        type: InterviewTypeGql.Technical,
        interviewerName: 'Jane Doe',
        notes: undefined,
      });

      expect(result.status).toBe('Scheduled');
      // Should NOT transition status, only update lastActivityAt
      expect(mockPrisma.candidate.update).toHaveBeenCalledWith({
        where: { id: 'cand-1' },
        data: { lastActivityAt: expect.any(Date) },
      });
    });

    it('should reject scheduling for candidates in Hired status', async () => {
      mockPrisma.candidate.findUnique.mockResolvedValue({
        id: 'cand-1',
        status: 'Hired',
      });

      await expect(service.schedule(validInput)).rejects.toThrow(BadRequestException);
      await expect(service.schedule(validInput)).rejects.toThrow(
        'Cannot schedule interviews for candidates in Hired status',
      );
    });

    it('should reject scheduling for candidates in Rejected status', async () => {
      mockPrisma.candidate.findUnique.mockResolvedValue({
        id: 'cand-1',
        status: 'Rejected',
      });

      await expect(service.schedule(validInput)).rejects.toThrow(BadRequestException);
      await expect(service.schedule(validInput)).rejects.toThrow(
        'Cannot schedule interviews for candidates in Rejected status',
      );
    });

    it('should reject scheduling with a past date', async () => {
      mockPrisma.candidate.findUnique.mockResolvedValue({
        id: 'cand-1',
        status: 'FormSubmitted',
      });

      const pastInput = {
        ...validInput,
        scheduledAt: new Date(Date.now() - 86400000).toISOString(), // yesterday
      };

      await expect(service.schedule(pastInput)).rejects.toThrow(BadRequestException);
      await expect(service.schedule(pastInput)).rejects.toThrow(
        'Interview date must be in the future',
      );
    });

    it('should reject scheduling with interviewer name exceeding 100 chars', async () => {
      const longInput = {
        ...validInput,
        interviewerName: 'A'.repeat(101),
      };

      await expect(service.schedule(longInput)).rejects.toThrow(BadRequestException);
    });

    it('should reject scheduling with empty interviewer name', async () => {
      const emptyNameInput = {
        ...validInput,
        interviewerName: '',
      };

      await expect(service.schedule(emptyNameInput)).rejects.toThrow(BadRequestException);
    });

    it('should reject scheduling with notes exceeding 1000 chars', async () => {
      const longNotesInput = {
        ...validInput,
        notes: 'N'.repeat(1001),
      };

      await expect(service.schedule(longNotesInput)).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException for non-existent candidate', async () => {
      mockPrisma.candidate.findUnique.mockResolvedValue(null);

      await expect(service.schedule(validInput)).rejects.toThrow(NotFoundException);
    });
  });

  describe('recordFeedback', () => {
    const validFeedback = {
      interviewId: 'int-1',
      recommendation: RecommendationGql.Hire,
      feedback: 'Great candidate, strong technical skills and communication.',
    };

    it('should record feedback and mark interview as Completed', async () => {
      mockPrisma.interview.findUnique.mockResolvedValue({
        id: 'int-1',
        candidateId: 'cand-1',
        status: 'Scheduled',
      });

      mockPrisma.interview.update.mockResolvedValue({
        id: 'int-1',
        candidateId: 'cand-1',
        type: 'Screening',
        scheduledAt: new Date(),
        interviewerName: 'John Smith',
        notes: null,
        status: 'Completed',
        recommendation: 'Hire',
        feedback: validFeedback.feedback,
        completedAt: expect.any(Date),
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      mockPrisma.candidate.update.mockResolvedValue({});
      mockTimelineService.logEvent.mockResolvedValue({});

      const result = await service.recordFeedback(validFeedback);

      expect(result.status).toBe('Completed');
      expect(result.recommendation).toBe('Hire');
      expect(mockPrisma.interview.update).toHaveBeenCalledWith({
        where: { id: 'int-1' },
        data: {
          recommendation: 'Hire',
          feedback: validFeedback.feedback,
          status: 'Completed',
          completedAt: expect.any(Date),
        },
        include: { candidate: { select: { id: true, name: true } } },
      });
      expect(mockTimelineService.logEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          candidateId: 'cand-1',
          eventType: 'feedback_submitted',
        }),
      );
    });

    it('should reject feedback for non-scheduled interview', async () => {
      mockPrisma.interview.findUnique.mockResolvedValue({
        id: 'int-1',
        candidateId: 'cand-1',
        status: 'Completed',
      });

      await expect(service.recordFeedback(validFeedback)).rejects.toThrow(BadRequestException);
    });

    it('should reject feedback with empty text', async () => {
      const emptyFeedback = { ...validFeedback, feedback: '' };

      await expect(service.recordFeedback(emptyFeedback)).rejects.toThrow(BadRequestException);
    });

    it('should reject feedback exceeding 2000 chars', async () => {
      const longFeedback = { ...validFeedback, feedback: 'F'.repeat(2001) };

      await expect(service.recordFeedback(longFeedback)).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException for non-existent interview', async () => {
      mockPrisma.interview.findUnique.mockResolvedValue(null);

      await expect(service.recordFeedback(validFeedback)).rejects.toThrow(NotFoundException);
    });
  });

  describe('findAll', () => {
    it('should return interviews sorted by scheduledAt ascending', async () => {
      const interviews = [
        { id: 'int-1', scheduledAt: new Date('2025-01-01') },
        { id: 'int-2', scheduledAt: new Date('2025-02-01') },
      ];

      mockPrisma.interview.findMany.mockResolvedValue(interviews);

      const result = await service.findAll();

      expect(result).toHaveLength(2);
      expect(mockPrisma.interview.findMany).toHaveBeenCalledWith({
        where: {},
        orderBy: { scheduledAt: 'asc' },
        include: { candidate: { select: { id: true, name: true } } },
      });
    });

    it('should apply candidateId filter', async () => {
      mockPrisma.interview.findMany.mockResolvedValue([]);

      await service.findAll({ candidateId: 'cand-1' });

      expect(mockPrisma.interview.findMany).toHaveBeenCalledWith({
        where: { candidateId: 'cand-1' },
        orderBy: { scheduledAt: 'asc' },
        include: { candidate: { select: { id: true, name: true } } },
      });
    });

    it('should apply type and status filters', async () => {
      mockPrisma.interview.findMany.mockResolvedValue([]);

      await service.findAll({
        type: InterviewTypeGql.Technical,
        status: InterviewStatusGql.Scheduled,
      });

      expect(mockPrisma.interview.findMany).toHaveBeenCalledWith({
        where: { type: 'Technical', status: 'Scheduled' },
        orderBy: { scheduledAt: 'asc' },
        include: { candidate: { select: { id: true, name: true } } },
      });
    });
  });

  describe('findById', () => {
    it('should return interview when found', async () => {
      mockPrisma.interview.findUnique.mockResolvedValue({
        id: 'int-1',
        candidateId: 'cand-1',
        type: 'Screening',
        status: 'Scheduled',
      });

      const result = await service.findById('int-1');
      expect(result.id).toBe('int-1');
    });

    it('should throw NotFoundException when not found', async () => {
      mockPrisma.interview.findUnique.mockResolvedValue(null);

      await expect(service.findById('non-existent')).rejects.toThrow(NotFoundException);
    });
  });
});
