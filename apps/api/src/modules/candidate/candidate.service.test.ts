import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { CandidateStatus } from '@rove-hire/shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PrismaService } from '../../prisma/prisma.service';
import { asMock } from '../../test-utils/mock-types';
import type { FileService } from '../file/file.service';
import type { JobService } from '../job/job.service';
import type { MagicLinkService } from '../magic-link/magic-link.service';
import type { StateMachineService } from '../state-machine/state-machine.service';
import type { TimelineService } from '../timeline/timeline.service';
import { CandidateService } from './candidate.service';

/**
 * Unit tests for CandidateService.
 * Tests: create, findAll, findById, updateStatus
 *
 * Validates: Requirements 4.1, 4.2, 4.5, 4.6, 4.7, 4.8, 4.9, 4.10, 4.11, 2.1, 2.2, 2.3, 2.6
 */

// Mock dependencies
const mockPrisma = {
  candidate: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    count: vi.fn(),
    create: vi.fn(),
  },
};

const mockFileService = {
  upload: vi.fn(),
  validateFile: vi.fn(),
};

const mockMagicLinkService = {
  generate: vi.fn(),
};

const mockJobService = {
  validateJobOpen: vi.fn(),
};

const mockStateMachineService = {
  executeTransition: vi.fn(),
};

const mockTimelineService = {
  logEvent: vi.fn(),
};

function createService(): CandidateService {
  return new CandidateService(
    asMock<PrismaService>(mockPrisma),
    asMock<FileService>(mockFileService),
    asMock<MagicLinkService>(mockMagicLinkService),
    asMock<JobService>(mockJobService),
    asMock<StateMachineService>(mockStateMachineService),
    asMock<TimelineService>(mockTimelineService),
  );
}

describe('CandidateService', () => {
  let service: CandidateService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = createService();
  });

  describe('create()', () => {
    const validInput = {
      name: 'John Doe',
      email: 'john@example.com',
      jobOpeningId: '550e8400-e29b-41d4-a716-446655440000',
    };
    const resumeBuffer = Buffer.from('fake pdf content');
    const resumeFilename = 'resume.pdf';

    it('should create a candidate with resume upload and magic link', async () => {
      mockJobService.validateJobOpen.mockResolvedValue(undefined);
      mockPrisma.candidate.findUnique.mockResolvedValue(null);
      mockFileService.upload.mockResolvedValue({
        s3Key: 'resumes/uuid/resume.pdf',
        bucket: 'rove-hire-uploads',
        size: resumeBuffer.length,
        originalName: 'resume.pdf',
      });
      mockPrisma.candidate.create.mockResolvedValue({
        id: 'candidate-id-1',
        name: 'John Doe',
        email: 'john@example.com',
        status: 'Applied',
        jobOpeningId: validInput.jobOpeningId,
        lastActivityAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      mockMagicLinkService.generate.mockResolvedValue({
        token: 'abc123',
        url: 'http://localhost:3001/candidate-application/abc123',
        expiresAt: new Date(),
      });
      mockTimelineService.logEvent.mockResolvedValue({});

      const result = await service.create(validInput, resumeBuffer, resumeFilename);

      expect(result.candidate.id).toBe('candidate-id-1');
      expect(result.candidate.status).toBe('Applied');
      expect(result.magicLinkUrl).toContain('/candidate-application/');
      expect(mockJobService.validateJobOpen).toHaveBeenCalledWith(validInput.jobOpeningId);
      expect(mockFileService.upload).toHaveBeenCalledWith(resumeBuffer, 'resumes', resumeFilename);
      expect(mockMagicLinkService.generate).toHaveBeenCalledWith('candidate-id-1');
      expect(mockTimelineService.logEvent).toHaveBeenCalled();
    });

    it('should reject if name exceeds 100 characters', async () => {
      const longName = 'A'.repeat(101);

      await expect(
        service.create({ ...validInput, name: longName }, resumeBuffer, resumeFilename),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject invalid email', async () => {
      await expect(
        service.create({ ...validInput, email: 'not-an-email' }, resumeBuffer, resumeFilename),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject if job is closed', async () => {
      mockJobService.validateJobOpen.mockRejectedValue(new BadRequestException('Job is closed'));

      await expect(service.create(validInput, resumeBuffer, resumeFilename)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should reject duplicate email+job combination', async () => {
      mockJobService.validateJobOpen.mockResolvedValue(undefined);
      mockPrisma.candidate.findUnique.mockResolvedValue({ id: 'existing' });

      await expect(service.create(validInput, resumeBuffer, resumeFilename)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should create DB record even if resume upload fails (non-fatal)', async () => {
      mockJobService.validateJobOpen.mockResolvedValue(undefined);
      mockPrisma.candidate.findUnique.mockResolvedValue(null);
      mockFileService.upload.mockRejectedValue(new Error('S3 unavailable'));
      mockPrisma.candidate.create.mockResolvedValue({
        id: 'cand-1',
        name: 'John Doe',
        email: 'john@example.com',
        status: 'Applied',
        jobOpeningId: '550e8400-e29b-41d4-a716-446655440000',
        createdAt: new Date('2026-06-20T20:15:03.601Z'),
        lastActivityAt: new Date('2026-06-20T20:15:03.601Z'),
        currentRole: null,
        location: null,
        phone: null,
        noticePeriod: null,
        linkedinUrl: null,
        resumeFileId: null,
        rejectionReason: null,
        salaryExpectation: null,
        updatedAt: new Date('2026-06-20T20:15:03.601Z'),
        jobOpening: { id: '550e8400-e29b-41d4-a716-446655440000', title: 'Software Engineer' },
        timelineEvents: [],
        interviews: [],
        documents: [],
        magicLinks: [],
      });

      const result = await service.create(validInput, resumeBuffer, resumeFilename);

      expect(result).toBeDefined();
      expect(result.candidate).toBeDefined();
      expect(mockPrisma.candidate.create).toHaveBeenCalled();
    });
  });

  describe('findAll()', () => {
    it('should return paginated results with default page size 20', async () => {
      const mockCandidates = Array.from({ length: 20 }, (_, i) => ({
        id: `id-${i}`,
        name: `Candidate ${i}`,
        email: `c${i}@test.com`,
        status: 'Applied',
        jobOpeningId: 'job-1',
        lastActivityAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      }));

      mockPrisma.candidate.count.mockResolvedValue(25);
      mockPrisma.candidate.findMany.mockResolvedValue(mockCandidates);

      const result = await service.findAll({});

      expect(result.items).toHaveLength(20);
      expect(result.total).toBe(25);
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(20);
      expect(result.totalPages).toBe(2);
      expect(result.hasNextPage).toBe(true);
      expect(result.hasPreviousPage).toBe(false);
    });

    it('should filter by status array', async () => {
      mockPrisma.candidate.count.mockResolvedValue(5);
      mockPrisma.candidate.findMany.mockResolvedValue([]);

      await service.findAll({ statuses: ['Applied', 'FormSubmitted'] });

      const whereArg = mockPrisma.candidate.findMany.mock.calls[0][0].where;
      expect(whereArg.status).toEqual({ in: ['Applied', 'FormSubmitted'] });
    });

    it('should search by name/role with ILIKE (min 2 chars)', async () => {
      mockPrisma.candidate.count.mockResolvedValue(2);
      mockPrisma.candidate.findMany.mockResolvedValue([]);

      await service.findAll({ search: 'Jo' });

      const whereArg = mockPrisma.candidate.findMany.mock.calls[0][0].where;
      expect(whereArg.OR).toEqual([
        { name: { contains: 'Jo', mode: 'insensitive' } },
        { currentRole: { contains: 'Jo', mode: 'insensitive' } },
      ]);
    });

    it('should ignore search with fewer than 2 characters', async () => {
      mockPrisma.candidate.count.mockResolvedValue(0);
      mockPrisma.candidate.findMany.mockResolvedValue([]);

      await service.findAll({ search: 'J' });

      const whereArg = mockPrisma.candidate.findMany.mock.calls[0][0].where;
      expect(whereArg.OR).toBeUndefined();
    });

    it('should sort by lastActivityAt DESC', async () => {
      mockPrisma.candidate.count.mockResolvedValue(0);
      mockPrisma.candidate.findMany.mockResolvedValue([]);

      await service.findAll({});

      const orderByArg = mockPrisma.candidate.findMany.mock.calls[0][0].orderBy;
      expect(orderByArg).toEqual({ lastActivityAt: 'desc' });
    });
  });

  describe('findById()', () => {
    it('should return candidate with full relations', async () => {
      const mockCandidate = {
        id: 'cand-1',
        name: 'Jane Doe',
        email: 'jane@test.com',
        status: 'Applied',
        jobOpeningId: 'job-1',
        lastActivityAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        jobOpening: { id: 'job-1', title: 'Engineer', skills: [] },
        documents: [],
        interviews: [],
        magicLink: null,
        timelineEvents: [],
      };

      mockPrisma.candidate.findUnique.mockResolvedValue(mockCandidate);

      const result = await service.findById('cand-1');

      expect(result.id).toBe('cand-1');
      expect(result.jobOpening).toBeDefined();
      expect(mockPrisma.candidate.findUnique).toHaveBeenCalledWith({
        where: { id: 'cand-1' },
        include: expect.objectContaining({
          jobOpening: expect.any(Object),
          documents: true,
          interviews: expect.any(Object),
          magicLink: true,
          timelineEvents: expect.any(Object),
        }),
      });
    });

    it('should throw NotFoundException for non-existent candidate', async () => {
      mockPrisma.candidate.findUnique.mockResolvedValue(null);

      await expect(service.findById('non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateStatus()', () => {
    it('should delegate to StateMachineService and return updated candidate', async () => {
      const updatedCandidate = {
        id: 'cand-1',
        name: 'Jane Doe',
        status: 'FormSubmitted',
        lastActivityAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockStateMachineService.executeTransition.mockResolvedValue({
        success: true,
        candidate: updatedCandidate,
      });

      const result = await service.updateStatus(
        'cand-1',
        CandidateStatus.FormSubmitted,
        {},
        'user-1',
      );

      expect(result.status).toBe('FormSubmitted');
      expect(mockStateMachineService.executeTransition).toHaveBeenCalledWith(
        'cand-1',
        'FormSubmitted',
        {},
        'user-1',
      );
    });

    it('should throw BadRequestException on invalid transition', async () => {
      mockStateMachineService.executeTransition.mockResolvedValue({
        success: false,
        error: {
          code: 'INVALID_TRANSITION',
          currentStatus: 'Applied',
          attemptedStatus: 'Hired',
          validTransitions: ['FormSubmitted', 'Rejected'],
        },
      });

      await expect(
        service.updateStatus('cand-1', CandidateStatus.Hired, {}, 'user-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw ConflictException on concurrent modification', async () => {
      mockStateMachineService.executeTransition.mockResolvedValue({
        success: false,
        error: {
          code: 'CONFLICT_ERROR',
          message: 'The candidate record was modified by another process.',
        },
      });

      await expect(
        service.updateStatus('cand-1', CandidateStatus.FormSubmitted, {}, 'user-1'),
      ).rejects.toThrow(ConflictException);
    });
  });
});
