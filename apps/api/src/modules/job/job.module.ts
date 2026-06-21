import { Module } from '@nestjs/common';
import { JobService } from './job.service';
import { JobResolver } from './job.resolver';

/**
 * JobModule provides job opening CRUD operations.
 * - JobService: business logic and validation
 * - JobResolver: GraphQL queries and mutations
 *
 * Exports JobService for use by CandidateModule (to validate job is open).
 *
 * PrismaModule is global, so PrismaService is available without import.
 *
 * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9, 3.10
 */
@Module({
  providers: [JobService, JobResolver],
  exports: [JobService],
})
export class JobModule {}
