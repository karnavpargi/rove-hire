import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NodeHttpHandler } from '@smithy/node-http-handler';
import { v4 as uuidv4 } from 'uuid';

/** Maximum file size: 10MB in bytes */
const MAX_FILE_SIZE = 10_485_760;

/** Accepted MIME type for uploads */
const ACCEPTED_MIME_TYPE = 'application/pdf';

/** S3 request timeout in milliseconds */
const S3_TIMEOUT_MS = 10_000;

/** Retry delay in milliseconds */
const RETRY_DELAY_MS = 2_000;

/** Default presigned URL expiry in seconds (15 minutes) */
const DEFAULT_PRESIGNED_EXPIRY = 900;

export interface FileValidationResult {
  valid: boolean;
  reason?: 'INVALID_MIME_TYPE' | 'FILE_TOO_LARGE';
}

export interface FileUploadInput {
  buffer: Buffer;
  originalName: string;
  mimetype: string;
  size: number;
}

export interface UploadedFile {
  s3Key: string;
  bucket: string;
  size: number;
  originalName: string;
}

@Injectable()
export class FileService {
  private readonly logger = new Logger(FileService.name);
  private readonly s3Client: S3Client;
  private readonly bucketName: string;

  constructor(private readonly configService: ConfigService) {
    this.bucketName = this.configService.get<string>('S3_BUCKET_NAME', 'rove-hire-uploads');

    const accessKeyId = this.configService.get<string>('AWS_ACCESS_KEY_ID');
    const secretAccessKey = this.configService.get<string>('AWS_SECRET_ACCESS_KEY');

    this.s3Client = new S3Client({
      region: this.configService.get<string>('AWS_REGION', 'us-east-1'),
      ...(accessKeyId && secretAccessKey
        ? { credentials: { accessKeyId, secretAccessKey } }
        : {}),
      requestHandler: new NodeHttpHandler({
        connectionTimeout: S3_TIMEOUT_MS,
        socketTimeout: S3_TIMEOUT_MS,
      }),
    });
  }

  /**
   * Validate a file for upload.
   * Checks PDF MIME type and 10MB size limit.
   */
  validateFile(file: { mimetype: string; size: number }): FileValidationResult {
    if (file.mimetype !== ACCEPTED_MIME_TYPE) {
      return { valid: false, reason: 'INVALID_MIME_TYPE' };
    }

    if (file.size > MAX_FILE_SIZE) {
      return { valid: false, reason: 'FILE_TOO_LARGE' };
    }

    return { valid: true };
  }

  /**
   * Upload a file buffer to S3 with a UUID v4 key path.
   * Format: `{prefix}/{uuid-v4}/{originalFilename}`
   *
   * Handles S3 unavailability: timeout at 10s, retry once after 2s.
   */
  async upload(file: Buffer, prefix: string, originalFilename?: string): Promise<UploadedFile> {
    const filename = originalFilename || `${uuidv4()}.pdf`;
    const key = `karnav_${prefix}/${uuidv4()}/${filename}`;

    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: key,
      Body: file,
      ContentType: ACCEPTED_MIME_TYPE,
    });

    try {
      await this.executeWithRetry(() => this.s3Client.send(command));
    } catch (error) {
      this.logger.error(`Failed to upload file to S3: ${key}`, error);
      throw new FileServiceError(
        `Failed to upload file to S3: ${(error as Error).message}`,
        'UPLOAD_FAILED',
      );
    }

    return {
      s3Key: key,
      bucket: this.bucketName,
      size: file.length,
      originalName: filename,
    };
  }

  /**
   * Generate a pre-signed download URL for an S3 object.
   * Default expiry is 15 minutes (900 seconds).
   */
  async getPresignedUrl(
    s3Key: string,
    expiresIn: number = DEFAULT_PRESIGNED_EXPIRY,
  ): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucketName,
      Key: s3Key,
    });

    try {
      const url = await this.executeWithRetry(() =>
        getSignedUrl(this.s3Client, command, { expiresIn }),
      );
      return url;
    } catch (error) {
      this.logger.error(`Failed to generate presigned URL for: ${s3Key}`, error);
      throw new FileServiceError(
        `Failed to generate presigned URL: ${(error as Error).message}`,
        'PRESIGNED_URL_FAILED',
      );
    }
  }

  /**
   * Delete an object from S3.
   */
  async delete(s3Key: string): Promise<void> {
    const command = new DeleteObjectCommand({
      Bucket: this.bucketName,
      Key: s3Key,
    });

    try {
      await this.executeWithRetry(() => this.s3Client.send(command));
    } catch (error) {
      this.logger.error(`Failed to delete file from S3: ${s3Key}`, error);
      throw new FileServiceError(
        `Failed to delete file from S3: ${(error as Error).message}`,
        'DELETE_FAILED',
      );
    }
  }

  /**
   * Execute an S3 operation with retry logic.
   * On first failure, wait 2s, retry once.
   * If second attempt fails, throw the error.
   */
  private async executeWithRetry<T>(operation: () => Promise<T>): Promise<T> {
    try {
      return await operation();
    } catch (firstError) {
      this.logger.warn(
        `S3 operation failed, retrying after ${RETRY_DELAY_MS}ms...`,
        (firstError as Error).message,
      );

      await this.delay(RETRY_DELAY_MS);

      try {
        return await operation();
      } catch (secondError) {
        this.logger.error('S3 operation failed on retry', (secondError as Error).message);
        throw secondError;
      }
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

/**
 * Custom error class for FileService operations.
 */
export class FileServiceError extends Error {
  constructor(
    message: string,
    public readonly code: 'UPLOAD_FAILED' | 'PRESIGNED_URL_FAILED' | 'DELETE_FAILED',
  ) {
    super(message);
    this.name = 'FileServiceError';
  }
}
