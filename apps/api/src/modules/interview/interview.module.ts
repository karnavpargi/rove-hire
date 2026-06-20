import { Module } from '@nestjs/common';
import { InterviewService } from './interview.service';
import { InterviewResolver } from './interview.resolver';
import { TimelineModule } from '../timeline';

/**
 * InterviewModule provides interview scheduling, feedback recording, and querying.
 * - InterviewService: business logic and validation
 * - InterviewResolver: GraphQL queries and mutations
 *
 * Imports TimelineModule for logging interview_scheduled and feedback_submitted events.
 * PrismaModule is global, so PrismaService is available without import.
 *
 * Exports InterviewService for use by other modules (e.g., DocumentModule for prerequisite checks).
 *
 * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8, 6.9
 */
@Module({
  imports: [TimelineModule],
  providers: [InterviewService, InterviewResolver],
  exports: [InterviewService],
})
export class InterviewModule {}
