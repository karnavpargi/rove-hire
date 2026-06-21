import { BadRequestException, NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PrismaService } from '../../prisma/prisma.service';
import { asMock } from '../../test-utils/mock-types';
import type { CreateJobOpeningInput } from './dto/create-job-opening.input';
import { JobService } from './job.service';

/**
 * Unit tests for JobService.
 * Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9, 3.10
 */

// Mock PrismaService
const mockTx = {
  jobOpening: {
    update: vi.fn(),
    findUnique: vi.fn(),
  },
  jobOpeningSkill: {
    findMany: vi.fn(),
    createMany: vi.fn(),
    deleteMany: vi.fn(),
  },
};

const mockPrisma = {
  jobOpening: {
    create: vi.fn(),
    findMany: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  jobOpeningSkill: {
    deleteMany: vi.fn(),
  },
  $transaction: vi.fn(),
};

describe('JobService', () => {
  let service: JobService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new JobService(asMock<PrismaService>(mockPrisma));

    // Default $transaction behaviour: execute callback with a mock transaction client
    mockPrisma.$transaction.mockImplementation(async (cb: (tx: typeof mockTx) => unknown) =>
      cb(mockTx),
    );
  });

  describe('create', () => {
    it('should create a job opening with valid input', async () => {
      const input = {
        title: 'Senior Developer',
        description: 'A great role',
        skills: ['TypeScript', 'Node.js'],
      };

      mockPrisma.jobOpening.create.mockResolvedValue({
        id: 'uuid-1',
        title: input.title,
        description: input.description,
        status: 'Open',
        skills: [
          { id: 'sk-1', tag: 'TypeScript' },
          { id: 'sk-2', tag: 'Node.js' },
        ],
        _count: { candidates: 0 },
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.create(input);

      expect(result.title).toBe('Senior Developer');
      expect(result.status).toBe('Open');
      expect(result.candidateCount).toBe(0);
      expect(mockPrisma.jobOpening.create).toHaveBeenCalledWith({
        data: {
          title: 'Senior Developer',
          description: 'A great role',
          status: 'Open',
          skills: {
            create: [{ tag: 'TypeScript' }, { tag: 'Node.js' }],
          },
        },
        include: {
          skills: true,
          _count: { select: { candidates: true } },
        },
      });
    });

    it('should default description to null when not provided', async () => {
      const input = {
        title: 'Developer',
        skills: ['React'],
      };

      mockPrisma.jobOpening.create.mockResolvedValue({
        id: 'uuid-2',
        title: input.title,
        description: null,
        status: 'Open',
        skills: [{ id: 'sk-3', tag: 'React' }],
        _count: { candidates: 0 },
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.create(input as unknown as CreateJobOpeningInput);

      expect(result.description).toBeNull();
      expect(mockPrisma.jobOpening.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ description: null }),
        }),
      );
    });

    it('should reject empty title', async () => {
      const input = { title: '', skills: ['React'] };
      await expect(service.create(input as unknown as CreateJobOpeningInput)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should reject title exceeding 200 characters', async () => {
      const input = { title: 'x'.repeat(201), skills: ['React'] };
      await expect(service.create(input as unknown as CreateJobOpeningInput)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should reject empty skills array', async () => {
      const input = { title: 'Developer', skills: [] };
      await expect(service.create(input as unknown as CreateJobOpeningInput)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should reject more than 20 skill tags', async () => {
      const input = {
        title: 'Developer',
        skills: Array.from({ length: 21 }, (_, i) => `skill-${i}`),
      };
      await expect(service.create(input as unknown as CreateJobOpeningInput)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should reject skill tag exceeding 50 characters', async () => {
      const input = {
        title: 'Developer',
        skills: ['x'.repeat(51)],
      };
      await expect(service.create(input as unknown as CreateJobOpeningInput)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should reject description exceeding 5000 characters', async () => {
      const input = {
        title: 'Developer',
        description: 'x'.repeat(5001),
        skills: ['React'],
      };
      await expect(service.create(input as unknown as CreateJobOpeningInput)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('findAll', () => {
    it('should return jobs ordered by createdAt DESC with candidate count', async () => {
      const now = new Date();
      const earlier = new Date(now.getTime() - 1000);

      mockPrisma.jobOpening.findMany.mockResolvedValue([
        {
          id: 'job-1',
          title: 'New Job',
          description: null,
          status: 'Open',
          skills: [{ id: 'sk-1', tag: 'TS' }],
          _count: { candidates: 3 },
          createdAt: now,
          updatedAt: now,
        },
        {
          id: 'job-2',
          title: 'Old Job',
          description: 'desc',
          status: 'Closed',
          skills: [],
          _count: { candidates: 1 },
          createdAt: earlier,
          updatedAt: earlier,
        },
      ]);

      const result = await service.findAll();

      expect(result).toHaveLength(2);
      expect(result[0].candidateCount).toBe(3);
      expect(result[1].candidateCount).toBe(1);
      expect(mockPrisma.jobOpening.findMany).toHaveBeenCalledWith({
        orderBy: { createdAt: 'desc' },
        include: {
          skills: true,
          _count: { select: { candidates: true } },
        },
      });
    });
  });

  describe('findById', () => {
    it('should return a job with skills and candidate count', async () => {
      mockPrisma.jobOpening.findUnique.mockResolvedValue({
        id: 'job-1',
        title: 'Developer',
        description: null,
        status: 'Open',
        skills: [{ id: 'sk-1', tag: 'React' }],
        _count: { candidates: 2 },
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.findById('job-1');

      expect(result.id).toBe('job-1');
      expect(result.candidateCount).toBe(2);
    });

    it('should throw NotFoundException for non-existent job', async () => {
      mockPrisma.jobOpening.findUnique.mockResolvedValue(null);

      await expect(service.findById('non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateStatus', () => {
    it('should update status from Open to Closed', async () => {
      mockPrisma.jobOpening.findUnique.mockResolvedValue({
        id: 'job-1',
        status: 'Open',
      });
      mockPrisma.jobOpening.update.mockResolvedValue({
        id: 'job-1',
        title: 'Developer',
        description: null,
        status: 'Closed',
        skills: [],
        _count: { candidates: 0 },
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.updateStatus('job-1', 'Closed');

      expect(result.status).toBe('Closed');
    });

    it('should update status from Closed to Open', async () => {
      mockPrisma.jobOpening.findUnique.mockResolvedValue({
        id: 'job-1',
        status: 'Closed',
      });
      mockPrisma.jobOpening.update.mockResolvedValue({
        id: 'job-1',
        title: 'Developer',
        description: null,
        status: 'Open',
        skills: [],
        _count: { candidates: 0 },
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.updateStatus('job-1', 'Open');

      expect(result.status).toBe('Open');
    });

    it('should throw NotFoundException for non-existent job', async () => {
      mockPrisma.jobOpening.findUnique.mockResolvedValue(null);

      await expect(service.updateStatus('non-existent', 'Open')).rejects.toThrow(NotFoundException);
    });

    it('should reject invalid status value', async () => {
      await expect(
        service.updateStatus('job-1', 'Invalid' as unknown as 'Open' | 'Closed'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('update', () => {
    const now = new Date();

    function mockUpdatedJob(overrides: Record<string, unknown> = {}) {
      return {
        id: 'job-1',
        title: 'Updated Developer',
        description: 'Updated description',
        status: 'Open',
        skills: [{ id: 'sk-1', tag: 'TypeScript' }],
        _count: { candidates: 2 },
        createdAt: now,
        updatedAt: now,
        ...overrides,
      };
    }

    function setupJobFound() {
      mockPrisma.jobOpening.findUnique.mockResolvedValue({ id: 'job-1', status: 'Open' });
    }

    function setupTransaction(result: unknown) {
      mockTx.jobOpening.update.mockResolvedValue(result);
    }

    it('should update title, description, and skills', async () => {
      setupJobFound();
      const updated = mockUpdatedJob();
      setupTransaction(updated);
      mockTx.jobOpeningSkill.findMany.mockResolvedValue([{ tag: 'Node.js' }, { tag: 'React' }]);

      const result = await service.update('job-1', {
        id: 'job-1',
        title: 'Updated Developer',
        description: 'Updated description',
        skills: ['TypeScript'],
      });

      expect(result.title).toBe('Updated Developer');
      expect(result.description).toBe('Updated description');
      expect(result.skills).toEqual([{ id: 'sk-1', tag: 'TypeScript' }]);
      expect(result.candidateCount).toBe(2);

      expect(mockTx.jobOpeningSkill.findMany).toHaveBeenCalledWith({
        where: { jobOpeningId: 'job-1' },
        select: { tag: true },
      });
      expect(mockTx.jobOpeningSkill.createMany).toHaveBeenCalledWith({
        data: [{ jobOpeningId: 'job-1', tag: 'TypeScript' }],
      });
      expect(mockTx.jobOpeningSkill.deleteMany).toHaveBeenCalledWith({
        where: { jobOpeningId: 'job-1', tag: { in: ['Node.js', 'React'] } },
      });

      expect(mockTx.jobOpening.update).toHaveBeenCalledWith({
        where: { id: 'job-1' },
        data: {
          title: 'Updated Developer',
          description: 'Updated description',
        },
        include: { skills: true, _count: { select: { candidates: true } } },
      });
    });

    it('should not update fields that are not provided', async () => {
      setupJobFound();
      const updated = mockUpdatedJob();
      setupTransaction(updated);

      await service.update('job-1', { id: 'job-1', title: 'Title Only' });

      expect(mockTx.jobOpening.update).toHaveBeenCalledWith({
        where: { id: 'job-1' },
        data: { title: 'Title Only' },
        include: { skills: true, _count: { select: { candidates: true } } },
      });

      // Skills not provided → no skill diff
      expect(mockTx.jobOpeningSkill.findMany).not.toHaveBeenCalled();
      expect(mockTx.jobOpeningSkill.createMany).not.toHaveBeenCalled();
      expect(mockTx.jobOpeningSkill.deleteMany).not.toHaveBeenCalled();
    });

    it('should update status only', async () => {
      setupJobFound();
      const updated = mockUpdatedJob({ status: 'Closed' });
      setupTransaction(updated);

      const result = await service.update('job-1', {
        id: 'job-1',
        status: 'Closed',
      });

      expect(result.status).toBe('Closed');
      expect(mockTx.jobOpening.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { status: 'Closed' },
        }),
      );
      expect(mockTx.jobOpeningSkill.findMany).not.toHaveBeenCalled();
      expect(mockTx.jobOpeningSkill.createMany).not.toHaveBeenCalled();
      expect(mockTx.jobOpeningSkill.deleteMany).not.toHaveBeenCalled();
    });

    it('should set description to null when explicitly passed as null', async () => {
      setupJobFound();
      const updated = mockUpdatedJob({ description: null });
      setupTransaction(updated);

      await service.update('job-1', {
        id: 'job-1',
        description: null,
      });

      expect(mockTx.jobOpening.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ description: null }),
        }),
      );
    });

    it('should throw NotFoundException for non-existent job', async () => {
      mockPrisma.jobOpening.findUnique.mockResolvedValue(null);

      await expect(
        service.update('non-existent', { id: 'non-existent', title: 'Ghost' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should reject empty title', async () => {
      setupJobFound();

      await expect(service.update('job-1', { id: 'job-1', title: '' })).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should reject title exceeding 200 characters', async () => {
      setupJobFound();

      await expect(
        service.update('job-1', { id: 'job-1', title: 'x'.repeat(201) }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject empty skills array', async () => {
      setupJobFound();

      await expect(service.update('job-1', { id: 'job-1', skills: [] })).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should reject more than 20 skill tags', async () => {
      setupJobFound();

      await expect(
        service.update('job-1', {
          id: 'job-1',
          skills: Array.from({ length: 21 }, (_, i) => `skill-${i}`),
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject description exceeding 5000 characters', async () => {
      setupJobFound();

      await expect(
        service.update('job-1', {
          id: 'job-1',
          description: 'x'.repeat(5001),
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('validateJobOpen', () => {
    it('should not throw for an Open job', async () => {
      mockPrisma.jobOpening.findUnique.mockResolvedValue({
        status: 'Open',
        title: 'Developer',
      });

      await expect(service.validateJobOpen('job-1')).resolves.toBeUndefined();
    });

    it('should throw BadRequestException for a Closed job', async () => {
      mockPrisma.jobOpening.findUnique.mockResolvedValue({
        status: 'Closed',
        title: 'Developer',
      });

      await expect(service.validateJobOpen('job-1')).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException for non-existent job', async () => {
      mockPrisma.jobOpening.findUnique.mockResolvedValue(null);

      await expect(service.validateJobOpen('non-existent')).rejects.toThrow(NotFoundException);
    });
  });
});
