import { Module } from '@nestjs/common';
import { DocumentService } from './document.service';
import { DocumentResolver } from './document.resolver';
import { FileModule } from '../file';
import { TimelineModule } from '../timeline';

/**
 * DocumentModule provides PDF generation (offer letter + NDA),
 * S3 storage, and document retrieval capabilities.
 *
 * Dependencies:
 * - FileModule: S3 upload, presigned URLs, deletion
 * - TimelineModule: logging timeline events for offer generation
 * - PrismaModule: database operations (globally provided)
 */
@Module({
  imports: [FileModule, TimelineModule],
  providers: [DocumentService, DocumentResolver],
  exports: [DocumentService],
})
export class DocumentModule {}
