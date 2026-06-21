import type { MiddlewareConsumer, NestModule } from '@nestjs/common';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { GraphQLModule } from '@nestjs/graphql';
import type { ApolloDriverConfig } from '@nestjs/apollo';
import { ApolloDriver } from '@nestjs/apollo';
import { join } from 'path';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { FileModule } from './modules/file';
import { StateMachineModule } from './modules/state-machine';
import { JobModule } from './modules/job';
import { MagicLinkModule } from './modules/magic-link';
import { TimelineModule } from './modules/timeline';
import { CandidateModule } from './modules/candidate';
import { InterviewModule } from './modules/interview';
import { DocumentModule } from './modules/document';
import { createDepthLimitPlugin } from './common/plugins/depth-limit.plugin';
import { createComplexityPlugin } from './common/plugins/complexity.plugin';
import { formatGraphQLError } from './common/errors/graphql-error-formatter';
import { ContentTypeMiddleware, CsrfOriginMiddleware } from './common/middleware';

/**
 * Root application module wiring all feature modules, GraphQL schema,
 * and security plugins together.
 *
 * GraphQL configuration (code-first):
 * - Auto-generates schema.gql from TypeScript decorators
 * - Query depth limiting: max 7 levels (Req 23.2)
 * - Query complexity analysis: max 1000 score (Req 23.3)
 * - Structured error formatting with code, message, and field path (Req 23.4, 23.5)
 * - Playground enabled in non-production environments
 *
 * Requirements: 23.1, 23.2, 23.3, 23.4, 23.5, 23.6, 23.8
 */
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [join(process.cwd(), '../../.env'), join(process.cwd(), '.env')],
    }),
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      autoSchemaFile: join(process.cwd(), 'schema.gql'),
      sortSchema: true,
      playground: process.env.NODE_ENV !== 'production',
      context: ({ req, res }: { req: unknown; res: unknown }) => ({ req, res }),
      /**
       * Apollo Server plugins for query security:
       * - Depth limit plugin rejects queries exceeding 7 levels of nesting
       * - Complexity plugin rejects queries scoring above 1000
       *
       * Requirements: 23.2, 23.3
       */
      plugins: [createDepthLimitPlugin(7), createComplexityPlugin(1000)],
      /**
       * Format all GraphQL errors into a structured response:
       * { message, extensions: { code, field?, details?, validTransitions? } }
       *
       * Requirements: 23.4, 23.5, 23.6
       */
      formatError: formatGraphQLError,
    }),
    PrismaModule,
    AuthModule,
    FileModule,
    StateMachineModule,
    JobModule,
    MagicLinkModule,
    TimelineModule,
    CandidateModule,
    InterviewModule,
    DocumentModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule implements NestModule {
  /**
   * Apply security middleware to all routes:
   * - ContentTypeMiddleware: Rejects requests with unsupported Content-Type (Req 13.9)
   * - CsrfOriginMiddleware: Validates Origin/Referer on state-changing requests (Req 13.3)
   *
   * Note on SQL injection (Req 13.1):
   * Prisma ORM uses parameterized queries by default, preventing SQL injection
   * at the database layer. No additional middleware needed for this protection.
   */
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(ContentTypeMiddleware, CsrfOriginMiddleware).forRoutes('*');
  }
}
