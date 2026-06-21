import { BadRequestException, Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { validateLoginForm } from '@rove-hire/shared';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import * as jwt from 'jsonwebtoken';
import { PrismaService } from '../../prisma/prisma.service';
import { RateLimitService } from './rate-limit.service';

/** JWT payload contents */
export interface JwtPayload {
  userId: string;
  email: string;
  sessionId: string;
}

/** Successful login result */
export interface LoginResult {
  token: string;
  expiresAt: Date;
  user: { id: string; email: string; name: string };
}

/** Cookie configuration options */
export interface CookieOptions {
  httpOnly: boolean;
  secure: boolean;
  sameSite: 'lax';
  path: string;
  maxAge: number;
}

const JWT_EXPIRY_HOURS = 8;
const JWT_EXPIRY_MS = JWT_EXPIRY_HOURS * 60 * 60 * 1000;
const GENERIC_AUTH_ERROR = 'Invalid email or password';

@Injectable()
export class AuthService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(RateLimitService) private readonly rateLimitService: RateLimitService,
  ) {}

  /**
   * Authenticate user with email and password.
   * Validates input format first, then checks credentials.
   * Tracks login attempts for rate limiting.
   * Returns JWT token and user info on success.
   *
   * Requirements: 1.2, 1.3, 1.7, 1.8, 1.9, 13.4, 13.7
   */
  async login(email: string, password: string, ip?: string): Promise<LoginResult> {
    const source = ip || 'unknown';

    // Validate input format before auth attempt
    const validation = validateLoginForm({ email, password });
    if (!validation.valid) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: validation.errors[0],
        errors: validation.errors,
      });
    }

    // Find user by email
    const user = await this.prisma.hrUser.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (!user) {
      // Track failed attempt (user not found)
      await this.rateLimitService.trackLoginAttempt(source, false);
      throw new UnauthorizedException(GENERIC_AUTH_ERROR);
    }

    // Compare password with stored hash (bcrypt cost 12)
    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      // Track failed attempt (wrong password)
      await this.rateLimitService.trackLoginAttempt(source, false);
      throw new UnauthorizedException(GENERIC_AUTH_ERROR);
    }

    // Track successful attempt
    await this.rateLimitService.trackLoginAttempt(source, true);

    // Create session and sign JWT
    const expiresAt = new Date(Date.now() + JWT_EXPIRY_MS);

    const session = await this.prisma.session.create({
      data: {
        userId: user.id,
        tokenHash: '', // Will be updated after signing
        expiresAt,
      },
    });

    const payload: JwtPayload = {
      userId: user.id,
      email: user.email,
      sessionId: session.id,
    };

    const secret = this.getJwtSecret();
    const token = jwt.sign(payload, secret, {
      algorithm: 'HS256',
      expiresIn: `${JWT_EXPIRY_HOURS}h`,
    });

    // Store hash of the token for session validation
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    await this.prisma.session.update({
      where: { id: session.id },
      data: { tokenHash },
    });

    return {
      token,
      expiresAt,
      user: { id: user.id, email: user.email, name: user.name },
    };
  }

  /**
   * Invalidate the session and clear the cookie.
   *
   * Requirements: 1.5
   */
  async logout(sessionId: string): Promise<void> {
    await this.prisma.session.update({
      where: { id: sessionId },
      data: { isInvalidated: true },
    });
  }

  /**
   * Validate a JWT token: verify signature, expiry, and session status.
   * Returns the decoded payload if valid.
   *
   * Requirements: 1.4, 1.6, 14.2
   */
  async validateSession(token: string): Promise<JwtPayload> {
    const secret = this.getJwtSecret();

    let payload: JwtPayload;
    try {
      payload = jwt.verify(token, secret, {
        algorithms: ['HS256'],
      }) as JwtPayload;
    } catch {
      throw new UnauthorizedException('Session expired or invalid');
    }

    // Verify session exists and is not invalidated
    const session = await this.prisma.session.findUnique({
      where: { id: payload.sessionId },
    });

    if (!session) {
      throw new UnauthorizedException('Session expired or invalid');
    }

    if (session.isInvalidated) {
      throw new UnauthorizedException('Session expired or invalid');
    }

    if (session.expiresAt < new Date()) {
      throw new UnauthorizedException('Session expired or invalid');
    }

    return payload;
  }

  /**
   * Get cookie configuration for the auth token.
   * Secure=true in production, false in development.
   */
  getCookieOptions(): CookieOptions {
    const cookieSecureEnv = process.env.COOKIE_SECURE;
    const secure =
      cookieSecureEnv !== undefined
        ? cookieSecureEnv === 'true'
        : process.env.NODE_ENV === 'production';
    return {
      httpOnly: true,
      secure,
      sameSite: 'lax',
      path: '/',
      maxAge: JWT_EXPIRY_MS,
    };
  }

  /**
   * Cookie name for the auth token.
   */
  getCookieName(): string {
    return 'rove_hire_session';
  }

  private getJwtSecret(): string {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new Error('JWT_SECRET environment variable is not configured');
    }
    return secret;
  }
}
