import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { GraphQLValidationPipe } from './common/pipes/graphql-validation.pipe';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';

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
  const app = await NestFactory.create(AppModule);

  // Security headers via Helmet (Req 13.6: HTTPS enforcement via HSTS)
  // Strict-Transport-Security ensures browsers only communicate over HTTPS
  app.use(
    helmet({
      hsts: {
        maxAge: 31536000, // 1 year
        includeSubDomains: true,
        preload: true,
      },
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
