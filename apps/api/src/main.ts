import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { GraphQLValidationPipe } from './common/pipes/graphql-validation.pipe';
import { FILE_UPLOAD } from '@rove-hire/shared';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';

/** Max JSON body size: 10MB PDF as base64 (~33% overhead) plus GraphQL envelope. */
const JSON_BODY_LIMIT_BYTES = Math.ceil(FILE_UPLOAD.MAX_SIZE_BYTES * (4 / 3)) + 512 * 1024;

/**
 * Bootstrap the ROVE Hire API application.
 *
 * Configures:
 * - Helmet for security headers (Strict-Transport-Security, X-Content-Type-Options, etc.)
 * - CORS restricted to FRONTEND_URL origin only
 * - Cookie parser for JWT session token reading from HttpOnly cookies
 * - Global validation pipe for all mutation inputs (required fields, max lengths, scalar types)
 *
 * Requirements: 13.1, 13.2, 13.3, 13.6, 13.9, 13.10, 23.5, 23.8
 */
async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // GraphQL resume uploads arrive as base64 in JSON; default 100kb limit is too small.
  app.useBodyParser('json', { limit: JSON_BODY_LIMIT_BYTES });

  // Security headers via Helmet (Req 13.6: HTTPS enforcement via HSTS)
  const enableHsts = process.env.ENABLE_HSTS !== 'false';
  app.use(
    helmet({
      hsts: enableHsts
        ? {
            maxAge: 31536000, // 1 year
            includeSubDomains: true,
            preload: true,
          }
        : false,
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:'],
        },
      },
    }),
  );

  // Cookie parser for reading JWT session tokens from HttpOnly cookies (Req 13.8)
  app.use(cookieParser());

  // CORS configuration (Req 13.10): restrict origins to frontend application only
  const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:3000';
  app.enableCors({
    origin: frontendUrl,
    credentials: true, // Allow cookies to be sent cross-origin
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  // Global validation pipe: validates all mutation input DTOs
  // before they reach resolver logic. Returns structured errors
  // with code, message, and field path on validation failure.
  app.useGlobalPipes(new GraphQLValidationPipe());

  const port = process.env.PORT ?? 3001;
  await app.listen(port);
  console.log(`🚀 ROVE Hire API running on http://localhost:${port}`);
}

bootstrap();
