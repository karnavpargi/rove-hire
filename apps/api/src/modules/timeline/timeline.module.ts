import { Module } from '@nestjs/common';
import { TimelineService } from './timeline.service';
import { TimelineResolver } from './timeline.resolver';

/**
 * TimelineModule provides the TimelineService for recording and querying
 * candidate timeline events. Includes a GraphQL resolver for direct
 * timeline event queries. Import this module into any feature module
 * that needs to log events (e.g., CandidateModule, InterviewModule, DocumentModule).
 *
 * Requirements: 7.2, 9.5, 10.4
 */
@Module({
  providers: [TimelineService, TimelineResolver],
  exports: [TimelineService],
})
export class TimelineModule {}
