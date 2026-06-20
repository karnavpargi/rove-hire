import { Inject } from '@nestjs/common';
import { Resolver, Mutation, Query, Args, Context } from '@nestjs/graphql';
import { DocumentService } from './document.service';
import { GenerateOfferInput } from './dto/generate-offer.input';
import { OfferDocumentsOutput } from './dto/offer-documents.output';
import { DocumentModel } from './dto/document.model';
import { DocumentListItemModel } from './dto/document-list-item.model';

/**
 * GraphQL resolver for document operations.
 * All mutations require authentication via the global JwtAuthGuard (APP_GUARD).
 */
@Resolver(() => DocumentModel)
export class DocumentResolver {
  constructor(@Inject(DocumentService) private readonly documentService: DocumentService) {}

  /**
   * List all documents across all candidates (HR documents page).
   */
  @Query(() => [DocumentListItemModel], {
    description: 'List all documents across candidates',
  })
  async documents(): Promise<DocumentListItemModel[]> {
    const rows = await this.documentService.findAll();
    return rows.map((doc) => ({
      id: doc.id,
      candidateId: doc.candidateId,
      type: doc.type,
      s3Key: doc.s3Key,
      originalFilename: doc.originalFilename,
      fileSizeBytes: doc.fileSizeBytes,
      createdAt: doc.createdAt.toISOString(),
      candidate: {
        id: doc.candidate.id,
        name: doc.candidate.name,
      },
    }));
  }

  /**
   * Generate offer letter and NDA PDFs for a candidate.
   * Validates input, checks prerequisites, generates PDFs, uploads to S3,
   * creates DB records, and updates candidate status — atomically.
   */
  @Mutation(() => OfferDocumentsOutput, {
    description: 'Generate offer letter and NDA PDFs for a candidate',
  })
  async generateOfferDocuments(
    @Args('input', { type: () => GenerateOfferInput }) input: GenerateOfferInput,
    @Context() context: { req: { user?: { id: string } } },
  ): Promise<OfferDocumentsOutput> {
    const userId = context.req.user?.id ?? 'system';
    return this.documentService.generateOfferDocuments(input, userId);
  }

  /**
   * Get a pre-signed download URL for a document (15-minute expiry).
   */
  @Query(() => String, {
    description: 'Get a pre-signed download URL for a document (15-min expiry)',
  })
  async documentUrl(@Args('id', { type: () => String }) documentId: string): Promise<string> {
    return this.documentService.getDocumentUrl(documentId);
  }

  /**
   * List all documents for a candidate.
   */
  @Query(() => [DocumentModel], {
    description: 'List all documents for a candidate',
  })
  async candidateDocuments(
    @Args('candidateId', { type: () => String }) candidateId: string,
  ): Promise<DocumentModel[]> {
    const documents = await this.documentService.findByCandidateId(candidateId);
    return documents.map((doc) => ({
      ...doc,
      createdAt: doc.createdAt.toISOString(),
    }));
  }
}
