import { Module } from '@nestjs/common';
import { CandidateService } from './candidate.service';
import { CandidateResolver } from './candidate.resolver';
import { ApplicationResolver } from './application.resolver';
import { FileModule } from '../file';
import { MagicLinkModule } from '../magic-link';
import { JobModule } from '../job';
import { StateMachineModule } from '../state-machine';
import { TimelineModule } from '../timeline';

/**
 * CandidateModule provides candidate CRUD operations and pipeline management.
 *
 * Imports:
 * - FileModule: resume upload to S3
 * - MagicLinkModule: generate magic links for application forms
 * - JobModule: validate job is open before creating candidates
 * - StateMachineModule: validated status transitions
 * - TimelineModule: log timeline events
 *
 * Providers:
 * - CandidateResolver: authenticated candidate management
 * - ApplicationResolver: public (@Public) magic link validation and form submission
 *
 * PrismaModule is global, so PrismaService is available without import.
 *
 * Requirements: 4.1, 4.2, 4.5, 4.6, 4.7, 4.8, 4.9, 4.10, 4.11, 2.1, 2.2, 2.3, 2.6, 5.1, 5.2
 */
@Module({
  imports: [FileModule, MagicLinkModule, JobModule, StateMachineModule, TimelineModule],
  providers: [CandidateService, CandidateResolver, ApplicationResolver],
  exports: [CandidateService],
})
export class CandidateModule {}
