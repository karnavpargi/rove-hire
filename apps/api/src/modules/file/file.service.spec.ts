import type { ConfigService } from '@nestjs/config';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FileService, FileServiceError } from './file.service';

// Mock UUID
vi.mock('uuid', () => ({
  v4: vi.fn().mockReturnValue('test-uuid-1234'),
}));

// Mock S3 client send
const mockSend = vi.fn();

vi.mock('@aws-sdk/client-s3', () => ({
  S3Client: vi.fn().mockImplementation(() => ({
    send: mockSend,
  })),
  PutObjectCommand: vi.fn().mockImplementation((input) => ({ _type: 'PutObject', input })),
  GetObjectCommand: vi.fn().mockImplementation((input) => ({ _type: 'GetObject', input })),
  DeleteObjectCommand: vi.fn().mockImplementation((input) => ({ _type: 'DeleteObject', input })),
}));

const mockGetSignedUrl = vi.fn().mockResolvedValue('https://s3.example.com/presigned-url');

vi.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: (...args: unknown[]) => mockGetSignedUrl(...args),
}));

vi.mock('@smithy/node-http-handler', () => ({
  NodeHttpHandler: vi.fn().mockImplementation(() => ({})),
}));

function createConfigService(): ConfigService {
  return {
    get: vi.fn((key: string, defaultValue?: string) => {
      const config: Record<string, string> = {
        S3_BUCKET_NAME: 'test-bucket',
        AWS_REGION: 'us-east-1',
        AWS_ACCESS_KEY_ID: 'test-key',
        AWS_SECRET_ACCESS_KEY: 'test-secret',
      };
      return config[key] ?? defaultValue;
    }),
  } as unknown as ConfigService;
}

describe('FileService', () => {
  let service: FileService;

  beforeEach(() => {
    vi.clearAllMocks();
    mockSend.mockResolvedValue({});
    mockGetSignedUrl.mockResolvedValue('https://s3.example.com/presigned-url');
    service = new FileService(createConfigService());
  });

  describe('validateFile', () => {
    it('should accept a valid PDF file under 10MB', () => {
      const result = service.validateFile({
        mimetype: 'application/pdf',
        size: 5_000_000,
      });
      expect(result).toEqual({ valid: true });
    });

    it('should accept a PDF file exactly at 10MB limit', () => {
      const result = service.validateFile({
        mimetype: 'application/pdf',
        size: 10_485_760,
      });
      expect(result).toEqual({ valid: true });
    });

    it('should reject a file with invalid MIME type', () => {
      const result = service.validateFile({
        mimetype: 'image/png',
        size: 1_000,
      });
      expect(result).toEqual({ valid: false, reason: 'INVALID_MIME_TYPE' });
    });

    it('should reject a file exceeding 10MB', () => {
      const result = service.validateFile({
        mimetype: 'application/pdf',
        size: 10_485_761,
      });
      expect(result).toEqual({ valid: false, reason: 'FILE_TOO_LARGE' });
    });

    it('should check MIME type before size (MIME type error takes priority)', () => {
      const result = service.validateFile({
        mimetype: 'text/plain',
        size: 20_000_000,
      });
      expect(result).toEqual({ valid: false, reason: 'INVALID_MIME_TYPE' });
    });

    it('should reject application/octet-stream MIME type', () => {
      const result = service.validateFile({
        mimetype: 'application/octet-stream',
        size: 1_000,
      });
      expect(result).toEqual({ valid: false, reason: 'INVALID_MIME_TYPE' });
    });
  });

  describe('upload', () => {
    it('should upload a file with UUID key path and original filename', async () => {
      const buffer = Buffer.from('pdf content');
      const result = await service.upload(buffer, 'resumes', 'my-resume.pdf');

      expect(result.s3Key).toMatch(/^karnav_resumes\/test-uuid-1234\/my-resume\.pdf$/);
      expect(result.bucket).toBe('test-bucket');
      expect(result.size).toBe(buffer.length);
      expect(result.originalName).toBe('my-resume.pdf');
    });

    it('should use the provided prefix in the S3 key', async () => {
      const buffer = Buffer.from('pdf content');
      const result = await service.upload(buffer, 'documents', 'offer.pdf');

      expect(result.s3Key).toMatch(/^karnav_documents\/test-uuid-1234\/offer\.pdf$/);
    });

    it('should generate a fallback filename when originalFilename is not provided', async () => {
      const buffer = Buffer.from('pdf content');
      const result = await service.upload(buffer, 'resumes');

      expect(result.s3Key).toMatch(/^karnav_resumes\/test-uuid-1234\/test-uuid-1234\.pdf$/);
    });

    it('should call S3 PutObjectCommand with correct params', async () => {
      const { PutObjectCommand } = await import('@aws-sdk/client-s3');
      const buffer = Buffer.from('pdf content');
      await service.upload(buffer, 'resumes', 'test.pdf');

      expect(PutObjectCommand).toHaveBeenCalledWith({
        Bucket: 'test-bucket',
        Key: 'karnav_resumes/test-uuid-1234/test.pdf',
        Body: buffer,
        ContentType: 'application/pdf',
      });
    });

    it('should retry once on first failure then succeed', async () => {
      mockSend.mockRejectedValueOnce(new Error('Network error')).mockResolvedValueOnce({});

      const buffer = Buffer.from('pdf content');
      const result = await service.upload(buffer, 'resumes', 'file.pdf');

      expect(result.s3Key).toMatch(/^karnav_resumes\/test-uuid-1234\/file\.pdf$/);
      expect(mockSend).toHaveBeenCalledTimes(2);
    });

    it('should throw FileServiceError when both attempts fail', async () => {
      mockSend
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'));

      const buffer = Buffer.from('pdf content');

      await expect(service.upload(buffer, 'resumes', 'file.pdf')).rejects.toThrow(FileServiceError);
    });

    it('should throw with UPLOAD_FAILED code when both attempts fail', async () => {
      mockSend
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'));

      const buffer = Buffer.from('pdf content');

      try {
        await service.upload(buffer, 'resumes', 'file.pdf');
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(FileServiceError);
        expect((error as FileServiceError).code).toBe('UPLOAD_FAILED');
      }
    });
  });

  describe('getPresignedUrl', () => {
    it('should generate a presigned URL with default 900s expiry', async () => {
      const url = await service.getPresignedUrl('resumes/test-uuid.pdf');

      expect(url).toBe('https://s3.example.com/presigned-url');
      expect(mockGetSignedUrl).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          _type: 'GetObject',
          input: {
            Bucket: 'test-bucket',
            Key: 'resumes/test-uuid.pdf',
          },
        }),
        { expiresIn: 900 },
      );
    });

    it('should accept a custom expiry time', async () => {
      await service.getPresignedUrl('resumes/test.pdf', 3600);

      expect(mockGetSignedUrl).toHaveBeenCalledWith(expect.anything(), expect.anything(), {
        expiresIn: 3600,
      });
    });

    it('should throw FileServiceError on presigned URL failure', async () => {
      mockGetSignedUrl
        .mockRejectedValueOnce(new Error('S3 unavailable'))
        .mockRejectedValueOnce(new Error('S3 unavailable'));

      try {
        await service.getPresignedUrl('key');
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(FileServiceError);
        expect((error as FileServiceError).code).toBe('PRESIGNED_URL_FAILED');
      }
    });
  });

  describe('delete', () => {
    it('should delete a file from S3', async () => {
      await expect(service.delete('resumes/test-uuid.pdf')).resolves.toBeUndefined();
      expect(mockSend).toHaveBeenCalledTimes(1);
    });

    it('should call DeleteObjectCommand with correct params', async () => {
      const { DeleteObjectCommand } = await import('@aws-sdk/client-s3');
      await service.delete('resumes/test-uuid.pdf');

      expect(DeleteObjectCommand).toHaveBeenCalledWith({
        Bucket: 'test-bucket',
        Key: 'resumes/test-uuid.pdf',
      });
    });

    it('should retry once on failure then succeed', async () => {
      mockSend.mockRejectedValueOnce(new Error('Timeout')).mockResolvedValueOnce({});

      await expect(service.delete('resumes/test.pdf')).resolves.toBeUndefined();
      expect(mockSend).toHaveBeenCalledTimes(2);
    });

    it('should throw FileServiceError when both delete attempts fail', async () => {
      mockSend
        .mockRejectedValueOnce(new Error('S3 error'))
        .mockRejectedValueOnce(new Error('S3 error'));

      try {
        await service.delete('key');
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(FileServiceError);
        expect((error as FileServiceError).code).toBe('DELETE_FAILED');
      }
    });
  });
});
