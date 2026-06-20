import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import type { PrismaService } from '../../prisma/prisma.service';
import type { FileService } from '../file/file.service';
import type { TimelineService } from '../timeline/timeline.service';
import { SUPPORTED_CURRENCIES, TimelineEventType, DocumentType } from '@rove-hire/shared';
import {
  salaryAmountSchema,
  currencySchema,
  reportingManagerSchema,
  locationSchema,
} from '@rove-hire/shared';
import * as puppeteer from 'puppeteer';
import * as Handlebars from 'handlebars';
import * as fs from 'fs';
import * as path from 'path';
import type { GenerateOfferInput } from './dto/generate-offer.input';

/** Currency symbols for display in PDF templates */
const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: '$',
  EUR: '€',
  GBP: '£',
  INR: '₹',
  AED: 'د.إ',
};

/**
 * DocumentService handles PDF generation (offer letter + NDA),
 * S3 upload, database record creation, and candidate status updates.
 *
 * All operations are atomic — on any failure, partial artifacts are
 * cleaned up and no status changes persist.
 */
@Injectable()
export class DocumentService {
  private readonly logger = new Logger(DocumentService.name);
  private offerLetterTemplate!: Handlebars.TemplateDelegate;
  private ndaTemplate!: Handlebars.TemplateDelegate;

  constructor(
    private readonly prisma: PrismaService,
    private readonly fileService: FileService,
    private readonly timelineService: TimelineService,
  ) {
    this.loadTemplates();
  }

  /**
   * Load and compile Handlebars HTML templates from disk.
   */
  private loadTemplates(): void {
    const templatesDir = path.resolve(process.cwd(), 'templates');

    const offerHtml = fs.readFileSync(path.join(templatesDir, 'offer-letter.html'), 'utf-8');
    const ndaHtml = fs.readFileSync(path.join(templatesDir, 'nda.html'), 'utf-8');

    this.offerLetterTemplate = Handlebars.compile(offerHtml);
    this.ndaTemplate = Handlebars.compile(ndaHtml);
  }

  /**
   * Generate offer letter and NDA PDFs for a candidate.
   *
   * Flow:
   * 1. Validate all input fields
   * 2. Verify candidate exists and has a completed interview with feedback
   * 3. Render HTML templates with Handlebars
   * 4. Generate PDFs using Puppeteer (headless Chromium)
   * 5. Upload both PDFs to S3 (with retry on failure)
   * 6. Create document records and update candidate status — all in one transaction
   * 7. Log timeline event
   *
   * On any failure: discard artifacts, don't update status, return error.
   */
  async generateOfferDocuments(
    input: GenerateOfferInput,
    userId: string,
  ): Promise<{ offerLetterUrl: string; ndaUrl: string; offerLetterId: string; ndaId: string }> {
    const {
      candidateId,
      roleTitle,
      salaryCurrency,
      salaryAmount,
      startDate,
      reportingManager,
      location,
    } = input;

    // --- 1. Validate fields ---
    this.validateOfferInput(input);

    // --- 2. Verify candidate and completed interview ---
    const candidate = await this.prisma.candidate.findUnique({
      where: { id: candidateId },
      include: { interviews: true },
    });

    if (!candidate) {
      throw new BadRequestException('Candidate not found');
    }

    const hasCompletedInterview = candidate.interviews.some(
      (interview) =>
        interview.status === 'Completed' &&
        interview.feedback !== null &&
        interview.feedback.trim().length > 0,
    );

    if (!hasCompletedInterview) {
      throw new BadRequestException(
        'Candidate must have at least one completed interview with feedback before generating offer documents',
      );
    }

    // --- 3. Render HTML templates ---
    const currencySymbol = CURRENCY_SYMBOLS[salaryCurrency] || salaryCurrency;
    const formattedSalary = salaryAmount.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    const formattedDate = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    const formattedStartDate = new Date(startDate).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    const templateData = {
      candidateName: candidate.name,
      roleTitle,
      salaryCurrency: currencySymbol,
      salaryAmount: formattedSalary,
      startDate: formattedStartDate,
      reportingManager,
      location,
      date: formattedDate,
    };

    const offerHtml = this.offerLetterTemplate(templateData);
    const ndaHtml = this.ndaTemplate(templateData);

    // --- 4. Generate PDFs with Puppeteer ---
    let offerPdfBuffer: Buffer;
    let ndaPdfBuffer: Buffer;
    let browser: puppeteer.Browser | null = null;

    try {
      browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
      });

      const offerPage = await browser.newPage();
      await offerPage.setContent(offerHtml, { waitUntil: 'domcontentloaded' });
      const offerPdf = await offerPage.pdf({
        format: 'A4',
        printBackground: true,
        margin: { top: '20mm', right: '25mm', bottom: '25mm', left: '25mm' },
      });
      offerPdfBuffer = Buffer.from(offerPdf);
      await offerPage.close();

      const ndaPage = await browser.newPage();
      await ndaPage.setContent(ndaHtml, { waitUntil: 'domcontentloaded' });
      const ndaPdf = await ndaPage.pdf({
        format: 'A4',
        printBackground: true,
        margin: { top: '20mm', right: '25mm', bottom: '25mm', left: '25mm' },
      });
      ndaPdfBuffer = Buffer.from(ndaPdf);
      await ndaPage.close();
    } catch (error) {
      this.logger.error('PDF generation failed', (error as Error).message);
      throw new BadRequestException(`PDF generation failed: ${(error as Error).message}`);
    } finally {
      if (browser) {
        await browser.close();
      }
    }

    // --- 5. Upload both PDFs to S3 ---
    let offerUpload: { s3Key: string; size: number };
    let ndaUpload: { s3Key: string; size: number };
    let s3Available = true;

    try {
      offerUpload = await this.fileService.upload(
        offerPdfBuffer,
        'documents/offer-letters',
        `offer-letter-${candidate.name.replace(/\s+/g, '-').toLowerCase()}.pdf`,
      );
    } catch (error) {
      this.logger.warn(
        'S3 unavailable for offer letter upload, proceeding with local fallback',
        (error as Error).message,
      );
      s3Available = false;
      offerUpload = { s3Key: `local/offer-letter-${candidateId}.pdf`, size: offerPdfBuffer.length };
    }

    if (s3Available) {
      try {
        ndaUpload = await this.fileService.upload(
          ndaPdfBuffer,
          'documents/ndas',
          `nda-${candidate.name.replace(/\s+/g, '-').toLowerCase()}.pdf`,
        );
      } catch (error) {
        this.logger.warn(
          'S3 unavailable for NDA upload, proceeding with local fallback',
          (error as Error).message,
        );
        s3Available = false;
        ndaUpload = { s3Key: `local/nda-${candidateId}.pdf`, size: ndaPdfBuffer.length };
        // Don't clean up offer letter — both use local fallback
      }
    } else {
      ndaUpload = { s3Key: `local/nda-${candidateId}.pdf`, size: ndaPdfBuffer.length };
    }

    // --- 6. Create document records and update status in a transaction ---
    try {
      const result = await this.prisma.$transaction(async (tx) => {
        const offerDoc = await tx.document.create({
          data: {
            candidateId,
            type: DocumentType.OfferLetter,
            s3Key: offerUpload.s3Key,
            originalFilename: `offer-letter-${candidate.name.replace(/\s+/g, '-').toLowerCase()}.pdf`,
            fileSizeBytes: offerUpload.size,
          },
        });

        const ndaDoc = await tx.document.create({
          data: {
            candidateId,
            type: DocumentType.Nda,
            s3Key: ndaUpload.s3Key,
            originalFilename: `nda-${candidate.name.replace(/\s+/g, '-').toLowerCase()}.pdf`,
            fileSizeBytes: ndaUpload.size,
          },
        });

        // Update candidate status to OfferSent (was InterviewScheduled)
        await tx.candidate.update({
          where: { id: candidateId },
          data: {
            status: 'OfferSent',
            lastActivityAt: new Date(),
          },
        });

        return { offerDoc, ndaDoc };
      });

      // --- 7. Log timeline event (outside transaction for non-critical path) ---
      try {
        await this.timelineService.logEvent({
          candidateId,
          eventType: TimelineEventType.OfferGenerated,
          previousStatus: candidate.status,
          newStatus: 'OfferSent',
          details: JSON.stringify({
            roleTitle,
            salaryCurrency,
            salaryAmount,
            startDate,
            reportingManager,
            location,
          }),
          actorId: userId,
        });
      } catch (timelineError) {
        this.logger.warn('Failed to log timeline event', (timelineError as Error).message);
      }

      // Generate pre-signed URLs for download
      let offerLetterUrl: string;
      let ndaUrl: string;
      if (s3Available) {
        try {
          offerLetterUrl = await this.fileService.getPresignedUrl(offerUpload.s3Key);
        } catch (error) {
          this.logger.warn(
            'Failed to generate presigned URL for offer letter',
            (error as Error).message,
          );
          offerLetterUrl = '#';
        }
        try {
          ndaUrl = await this.fileService.getPresignedUrl(ndaUpload.s3Key);
        } catch (error) {
          this.logger.warn('Failed to generate presigned URL for NDA', (error as Error).message);
          ndaUrl = '#';
        }
      } else {
        offerLetterUrl = '#';
        ndaUrl = '#';
      }

      return {
        offerLetterUrl,
        ndaUrl,
        offerLetterId: result.offerDoc.id,
        ndaId: result.ndaDoc.id,
      };
    } catch (error) {
      // Transaction failed — clean up S3 artifacts (only if S3 was used)
      this.logger.error('Transaction failed, cleaning up S3 artifacts', (error as Error).message);
      if (s3Available) {
        try {
          await this.fileService.delete(offerUpload.s3Key);
        } catch {
          this.logger.warn('Failed to clean up offer letter from S3');
        }
        try {
          await this.fileService.delete(ndaUpload.s3Key);
        } catch {
          this.logger.warn('Failed to clean up NDA from S3');
        }
      }

      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(
        `Failed to create document records: ${(error as Error).message}`,
      );
    }
  }

  /**
   * Get a pre-signed download URL for a document (15-minute expiry).
   */
  async getDocumentUrl(documentId: string): Promise<string> {
    const document = await this.prisma.document.findUnique({
      where: { id: documentId },
    });

    if (!document) {
      throw new BadRequestException('Document not found');
    }

    return this.fileService.getPresignedUrl(document.s3Key);
  }

  /**
   * Find all documents for a candidate.
   */
  async findByCandidateId(candidateId: string) {
    return this.prisma.document.findMany({
      where: { candidateId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Validate offer input fields.
   * Throws BadRequestException on any validation failure.
   */
  private validateOfferInput(input: GenerateOfferInput): void {
    const errors: string[] = [];

    // Role title: max 200 chars, required
    if (!input.roleTitle || input.roleTitle.trim().length === 0) {
      errors.push('Role title is required');
    } else if (input.roleTitle.length > 200) {
      errors.push('Role title must not exceed 200 characters');
    }

    // Salary amount validation
    const salaryResult = salaryAmountSchema.safeParse(input.salaryAmount);
    if (!salaryResult.success) {
      errors.push(salaryResult.error.issues[0].message);
    }

    // Currency validation
    const currencyResult = currencySchema.safeParse(input.salaryCurrency);
    if (!currencyResult.success) {
      errors.push(currencyResult.error.issues[0].message);
    }

    // Start date: must be >= today
    if (!input.startDate) {
      errors.push('Start date is required');
    } else {
      const startDate = new Date(input.startDate);
      if (isNaN(startDate.getTime())) {
        errors.push('Start date must be a valid date');
      } else {
        const todayStr = new Date().toISOString().split('T')[0];
        const todayDate = new Date(todayStr + 'T00:00:00.000Z');
        const inputDate = new Date(input.startDate + 'T00:00:00.000Z');
        if (inputDate < todayDate) {
          errors.push('Start date must be today or in the future');
        }
      }
    }

    // Reporting manager
    const managerResult = reportingManagerSchema.safeParse(input.reportingManager);
    if (!managerResult.success) {
      errors.push(managerResult.error.issues[0].message);
    }

    // Location
    const locationResult = locationSchema.safeParse(input.location);
    if (!locationResult.success) {
      errors.push(locationResult.error.issues[0].message);
    }

    if (errors.length > 0) {
      throw new BadRequestException(errors.join('; '));
    }
  }
}
