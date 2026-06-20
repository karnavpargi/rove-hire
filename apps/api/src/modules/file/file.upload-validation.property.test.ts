/**
 * Property 10: File Upload Validation
 *
 * Property-based tests verifying that file upload validation correctly
 * accepts files iff MIME type is exactly 'application/pdf' AND size is
 * <= 10,485,760 bytes. Errors must identify the specific violation
 * (wrong MIME type vs file too large). MIME type check takes priority
 * over size check.
 *
 * **Validates: Requirements 4.3, 4.4, 4.5, 21.3**
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { FileService } from './file.service';
import { ConfigService } from '@nestjs/config';

const MAX_FILE_SIZE = 10_485_760; // 10MB in bytes
const ACCEPTED_MIME = 'application/pdf';

/** List of common MIME types for generating random non-PDF types */
const NON_PDF_MIMES = [
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
  'text/plain',
  'text/html',
  'text/csv',
  'application/json',
  'application/xml',
  'application/zip',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'video/mp4',
  'audio/mpeg',
  'application/octet-stream',
  'multipart/form-data',
];

/** All MIME types including the accepted one */
const ALL_MIMES = [ACCEPTED_MIME, ...NON_PDF_MIMES];

describe('Property 10: File Upload Validation', () => {
  let service: FileService;

  beforeEach(() => {
    const mockConfigService = {
      get: (key: string, defaultValue: string) => defaultValue,
    } as unknown as ConfigService;
    service = new FileService(mockConfigService);
  });

  /**
   * Arbitrary: random MIME type from a realistic pool
   */
  const mimeArbitrary = fc.constantFrom(...ALL_MIMES);

  /**
   * Arbitrary: non-PDF MIME type
   */
  const nonPdfMimeArbitrary = fc.constantFrom(...NON_PDF_MIMES);

  /**
   * Arbitrary: file size between 0 and 20MB (double the limit for good coverage)
   */
  const sizeArbitrary = fc.integer({ min: 0, max: 20_971_520 });

  /**
   * Arbitrary: valid file size (<= 10MB)
   */
  const validSizeArbitrary = fc.integer({ min: 0, max: MAX_FILE_SIZE });

  /**
   * Arbitrary: oversized file (> 10MB)
   */
  const oversizeArbitrary = fc.integer({ min: MAX_FILE_SIZE + 1, max: 20_971_520 });

  it('accepts file iff MIME = application/pdf AND size <= 10,485,760', () => {
    fc.assert(
      fc.property(mimeArbitrary, sizeArbitrary, (mimetype, size) => {
        const result = service.validateFile({ mimetype, size });
        const shouldBeValid = mimetype === ACCEPTED_MIME && size <= MAX_FILE_SIZE;

        expect(result.valid).toBe(shouldBeValid);
      }),
      { numRuns: 500 },
    );
  });

  it('valid PDF files within size limit are always accepted', () => {
    fc.assert(
      fc.property(validSizeArbitrary, (size) => {
        const result = service.validateFile({ mimetype: ACCEPTED_MIME, size });

        expect(result.valid).toBe(true);
        expect(result.reason).toBeUndefined();
      }),
      { numRuns: 200 },
    );
  });

  it('non-PDF MIME types are always rejected with INVALID_MIME_TYPE', () => {
    fc.assert(
      fc.property(nonPdfMimeArbitrary, sizeArbitrary, (mimetype, size) => {
        const result = service.validateFile({ mimetype, size });

        expect(result.valid).toBe(false);
        expect(result.reason).toBe('INVALID_MIME_TYPE');
      }),
      { numRuns: 300 },
    );
  });

  it('PDF files exceeding 10MB are rejected with FILE_TOO_LARGE', () => {
    fc.assert(
      fc.property(oversizeArbitrary, (size) => {
        const result = service.validateFile({ mimetype: ACCEPTED_MIME, size });

        expect(result.valid).toBe(false);
        expect(result.reason).toBe('FILE_TOO_LARGE');
      }),
      { numRuns: 200 },
    );
  });

  it('MIME type check takes priority over size check (wrong MIME + oversized = INVALID_MIME_TYPE)', () => {
    fc.assert(
      fc.property(nonPdfMimeArbitrary, oversizeArbitrary, (mimetype, size) => {
        const result = service.validateFile({ mimetype, size });

        // When both MIME and size are invalid, MIME error takes priority
        expect(result.valid).toBe(false);
        expect(result.reason).toBe('INVALID_MIME_TYPE');
      }),
      { numRuns: 200 },
    );
  });

  it('boundary: file at exactly 10,485,760 bytes is accepted', () => {
    const result = service.validateFile({ mimetype: ACCEPTED_MIME, size: MAX_FILE_SIZE });
    expect(result.valid).toBe(true);
    expect(result.reason).toBeUndefined();
  });

  it('boundary: file at 10,485,761 bytes is rejected as too large', () => {
    const result = service.validateFile({ mimetype: ACCEPTED_MIME, size: MAX_FILE_SIZE + 1 });
    expect(result.valid).toBe(false);
    expect(result.reason).toBe('FILE_TOO_LARGE');
  });

  it('error reason is always defined for rejected files', () => {
    fc.assert(
      fc.property(mimeArbitrary, sizeArbitrary, (mimetype, size) => {
        const result = service.validateFile({ mimetype, size });

        if (!result.valid) {
          expect(result.reason).toBeDefined();
          expect(['INVALID_MIME_TYPE', 'FILE_TOO_LARGE']).toContain(result.reason);
        }
      }),
      { numRuns: 300 },
    );
  });
});
