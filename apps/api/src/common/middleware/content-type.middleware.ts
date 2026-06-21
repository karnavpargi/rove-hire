import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

/**
 * Middleware that rejects requests with unsupported Content-Type headers.
 *
 * Accepted content types:
 * - application/json (GraphQL queries/mutations)
 * - multipart/form-data (file uploads)
 *
 * Requests without a body (GET, OPTIONS, HEAD) are allowed through
 * regardless of Content-Type since they don't carry payloads.
 *
 * Requirements: 13.9
 */
@Injectable()
export class ContentTypeMiddleware implements NestMiddleware {
  private static readonly ACCEPTED_TYPES = [
    'application/json',
    'multipart/form-data',
  ];

  use(req: Request, res: Response, next: NextFunction): void {
    // Allow requests that typically don't have a body
    if (['GET', 'OPTIONS', 'HEAD'].includes(req.method)) {
      return next();
    }

    const contentType = req.headers['content-type'];

    // If no content-type header on a body-carrying request, reject
    if (!contentType) {
      res.status(415).json({
        errors: [
          {
            message: 'Unsupported Media Type: Content-Type header is required',
            extensions: {
              code: 'UNSUPPORTED_MEDIA_TYPE',
              details:
                'Accepted content types: application/json, multipart/form-data',
            },
          },
        ],
      });
      return;
    }

    // Check if the content-type starts with any accepted type
    const isAccepted = ContentTypeMiddleware.ACCEPTED_TYPES.some((type) =>
      contentType.toLowerCase().startsWith(type),
    );

    if (!isAccepted) {
      res.status(415).json({
        errors: [
          {
            message: `Unsupported Media Type: ${contentType}`,
            extensions: {
              code: 'UNSUPPORTED_MEDIA_TYPE',
              details:
                'Accepted content types: application/json, multipart/form-data',
            },
          },
        ],
      });
      return;
    }

    next();
  }
}
