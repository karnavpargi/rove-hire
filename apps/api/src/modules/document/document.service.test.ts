import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import { DocumentService } from './document.service';
import type { GenerateOfferInput } from './dto/generate-offer.input';

// Mock Puppeteer
vi.mock('puppeteer', () => ({
  default: {
    launch: vi.fn(),
  },
  launch: vi.fn(),
}));

// Mock fs
vi.mock('fs', () => ({
  default: {
    readFileSync: vi.fn(() => '<html>{{candidateName}}</html>'),
  },
  readFileSync: vi.fn(() => '<html>{{candidateName}}</html>'),
}));

describe('DocumentService', () => {
  let service: DocumentService;
  let mockPrisma: any;
  let mockFileService: any;
  let mockTimelineService: any;

  beforeEach(() => {
    mockPrisma = {
      candidate: {
        findUnique: vi.fn(),
        update: vi.fn(),
      },
      document: {
        create: vi.fn(),
        findUnique: vi.fn(),
        findMany: vi.fn(),
      },
      $transaction: vi.fn((fn) => fn(mockPrisma)),
    };

    mockFileService = {
      upload: vi.fn().mockResolvedValue({ s3Key: 'test-key', size: 1024, bucket: 'test' }),
      getPresignedUrl: vi.fn().mockResolvedValue('https://s3.example.com/presigned'),
      delete: vi.fn().mockResolvedValue(undefined),
    };

    mockTimelineService = {
      logEvent: vi.fn().mockResolvedValue({}),
    };

    service = new DocumentService(
      mockPrisma,
      mockFileService,
      mockTimelineService,
    );
  });

  describe('validateOfferInput (via generateOfferDocuments)', () => {
    const validInput: GenerateOfferInput = {
      candidateId: 'candidate-123',
      roleTitle: 'Senior Engineer',
      salaryCurrency: 'USD',
      salaryAmount: 150000.00,
      startDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
      reportingManager: 'John Doe',
      location: 'Dubai, UAE',
    };

    it('should reject missing role title', async () => {
      const input = { ...validInput, roleTitle: '' };
      await expect(
        service.generateOfferDocuments(input, 'user-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject role title exceeding 200 chars', async () => {
      const input = { ...validInput, roleTitle: 'x'.repeat(201) };
      await expect(
        service.generateOfferDocuments(input, 'user-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject salary below 0.01', async () => {
      const input = { ...validInput, salaryAmount: 0 };
      await expect(
        service.generateOfferDocuments(input, 'user-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject salary above 9,999,999.99', async () => {
      const input = { ...validInput, salaryAmount: 10_000_000 };
      await expect(
        service.generateOfferDocuments(input, 'user-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject salary with more than 2 decimal places', async () => {
      const input = { ...validInput, salaryAmount: 100.123 };
      await expect(
        service.generateOfferDocuments(input, 'user-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject unsupported currency', async () => {
      const input = { ...validInput, salaryCurrency: 'XYZ' };
      await expect(
        service.generateOfferDocuments(input, 'user-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should accept all supported currencies', async () => {
      // This test just validates the input validation doesn't throw for valid currencies
      // It will throw later due to candidate lookup, but that proves validation passed
      mockPrisma.candidate.findUnique.mockResolvedValue(null);

      for (const currency of ['USD', 'EUR', 'GBP', 'INR', 'AED']) {
        const input = { ...validInput, salaryCurrency: currency };
        await expect(
          service.generateOfferDocuments(input, 'user-1'),
        ).rejects.toThrow('Candidate not found');
      }
    });

    it('should reject past start date', async () => {
      const input = {
        ...validInput,
        startDate: '2020-01-01',
      };
      await expect(
        service.generateOfferDocuments(input, 'user-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should accept today as start date', async () => {
      const today = new Date().toISOString().split('T')[0];
      const input = { ...validInput, startDate: today };
      mockPrisma.candidate.findUnique.mockResolvedValue(null);
      // Should fail on candidate not found, not validation
      await expect(
        service.generateOfferDocuments(input, 'user-1'),
      ).rejects.toThrow('Candidate not found');
    });

    it('should reject missing reporting manager', async () => {
      const input = { ...validInput, reportingManager: '' };
      await expect(
        service.generateOfferDocuments(input, 'user-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject reporting manager exceeding 100 chars', async () => {
      const input = { ...validInput, reportingManager: 'x'.repeat(101) };
      await expect(
        service.generateOfferDocuments(input, 'user-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject missing location', async () => {
      const input = { ...validInput, location: '' };
      await expect(
        service.generateOfferDocuments(input, 'user-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject location exceeding 200 chars', async () => {
      const input = { ...validInput, location: 'x'.repeat(201) };
      await expect(
        service.generateOfferDocuments(input, 'user-1'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('generateOfferDocuments - prerequisite checks', () => {
    const validInput: GenerateOfferInput = {
      candidateId: 'candidate-123',
      roleTitle: 'Senior Engineer',
      salaryCurrency: 'USD',
      salaryAmount: 150000.00,
      startDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
      reportingManager: 'John Doe',
      location: 'Dubai, UAE',
    };

    it('should reject when candidate not found', async () => {
      mockPrisma.candidate.findUnique.mockResolvedValue(null);
      await expect(
        service.generateOfferDocuments(validInput, 'user-1'),
      ).rejects.toThrow('Candidate not found');
    });

    it('should reject when candidate has no completed interview', async () => {
      mockPrisma.candidate.findUnique.mockResolvedValue({
        id: 'candidate-123',
        name: 'Test Candidate',
        status: 'InterviewScheduled',
        interviews: [
          { status: 'Scheduled', feedback: null },
        ],
      });
      await expect(
        service.generateOfferDocuments(validInput, 'user-1'),
      ).rejects.toThrow('at least one completed interview with feedback');
    });

    it('should reject when interview is completed but has no feedback', async () => {
      mockPrisma.candidate.findUnique.mockResolvedValue({
        id: 'candidate-123',
        name: 'Test Candidate',
        status: 'InterviewScheduled',
        interviews: [
          { status: 'Completed', feedback: '' },
        ],
      });
      await expect(
        service.generateOfferDocuments(validInput, 'user-1'),
      ).rejects.toThrow('at least one completed interview with feedback');
    });

    it('should reject when interview is completed but feedback is only whitespace', async () => {
      mockPrisma.candidate.findUnique.mockResolvedValue({
        id: 'candidate-123',
        name: 'Test Candidate',
        status: 'InterviewScheduled',
        interviews: [
          { status: 'Completed', feedback: '   ' },
        ],
      });
      await expect(
        service.generateOfferDocuments(validInput, 'user-1'),
      ).rejects.toThrow('at least one completed interview with feedback');
    });
  });

  describe('getDocumentUrl', () => {
    it('should return presigned URL for existing document', async () => {
      mockPrisma.document.findUnique.mockResolvedValue({
        id: 'doc-1',
        s3Key: 'documents/offer-letters/test.pdf',
      });
      mockFileService.getPresignedUrl.mockResolvedValue('https://s3.example.com/signed-url');

      const url = await service.getDocumentUrl('doc-1');
      expect(url).toBe('https://s3.example.com/signed-url');
      expect(mockFileService.getPresignedUrl).toHaveBeenCalledWith('documents/offer-letters/test.pdf');
    });

    it('should throw when document not found', async () => {
      mockPrisma.document.findUnique.mockResolvedValue(null);
      await expect(service.getDocumentUrl('nonexistent')).rejects.toThrow('Document not found');
    });
  });

  describe('findByCandidateId', () => {
    it('should return documents for a candidate ordered by createdAt desc', async () => {
      const mockDocuments = [
        { id: 'doc-1', type: 'OfferLetter', createdAt: new Date() },
        { id: 'doc-2', type: 'Nda', createdAt: new Date() },
      ];
      mockPrisma.document.findMany.mockResolvedValue(mockDocuments);

      const result = await service.findByCandidateId('candidate-123');
      expect(result).toEqual(mockDocuments);
      expect(mockPrisma.document.findMany).toHaveBeenCalledWith({
        where: { candidateId: 'candidate-123' },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should return empty array when no documents exist', async () => {
      mockPrisma.document.findMany.mockResolvedValue([]);
      const result = await service.findByCandidateId('candidate-123');
      expect(result).toEqual([]);
    });
  });
});
