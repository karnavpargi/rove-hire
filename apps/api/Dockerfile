# =============================================================================
# ROVE Hire API — Multi-Stage Docker Build
# Base: node:20-alpine for minimal image size (<500MB)
# =============================================================================

# ---------------------------------------------------------------------------
# Stage 1: Build
# ---------------------------------------------------------------------------
FROM node:20-alpine AS build

WORKDIR /app

# Install Chromium and its dependencies for Puppeteer PDF generation
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    freetype-dev \
    harfbuzz \
    ca-certificates \
    ttf-freefont

# Install pnpm globally
RUN corepack enable && corepack prepare pnpm@9.15.4 --activate

# Copy workspace root configs needed for dependency resolution
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY turbo.json ./

# Copy package manifests for all workspaces (needed for pnpm install)
COPY apps/api/package.json apps/api/
COPY packages/shared/package.json packages/shared/

# Install all dependencies (including devDependencies for build)
RUN pnpm install --frozen-lockfile

# Copy source code
COPY packages/shared/ packages/shared/
COPY apps/api/ apps/api/

# Build the shared package first, then the API
RUN pnpm --filter @rove-hire/shared build 2>/dev/null || true
RUN cd apps/api && pnpm exec prisma generate
RUN pnpm --filter @rove-hire/api build

# ---------------------------------------------------------------------------
# Stage 2: Production
# ---------------------------------------------------------------------------
FROM node:20-alpine AS production

# Set metadata labels
LABEL org.opencontainers.image.title="ROVE Hire API"
LABEL org.opencontainers.image.description="NestJS backend for ROVE Hire recruitment platform"

# Install curl for health checks and dumb-init for proper signal handling
RUN apk add --no-cache curl dumb-init

# Install Chromium for Puppeteer PDF generation
RUN addgroup -g 1001 -S nestjs && \
    adduser -u 1001 -S nestjs -G nestjs && \
    apk add --no-cache \
    chromium \
    nss \
    freetype \
    freetype-dev \
    harfbuzz \
    ca-certificates \
    ttf-freefont

# Create non-root user for the API process

WORKDIR /app

# Install pnpm for production dependency installation
RUN corepack enable && corepack prepare pnpm@9.15.4 --activate

# Copy workspace config for production install
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json apps/api/
COPY packages/shared/package.json packages/shared/

# Install production dependencies and Prisma CLI for runtime migrations
RUN pnpm install --frozen-lockfile --prod && \
    pnpm add prisma@6.8.2 --filter @rove-hire/api

# Copy built artifacts from build stage
COPY --from=build /app/apps/api/dist apps/api/dist
COPY --from=build /app/packages/shared/dist packages/shared/dist 2>/dev/null || true
COPY --from=build /app/packages/shared/src packages/shared/src
COPY --from=build /app/apps/api/prisma apps/api/prisma
COPY --from=build /app/apps/api/templates /app/templates

# Generate Prisma client for production runtime
RUN cd apps/api && pnpm exec prisma generate

COPY apps/api/docker-entrypoint.sh /app/docker-entrypoint.sh
RUN chmod +x /app/docker-entrypoint.sh

# Set ownership to non-root user
RUN chown -R nestjs:nestjs /app

USER nestjs

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000
# Point Puppeteer to the system-installed Chromium
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

EXPOSE 3000

# Health check: poll /api/health every 30s, 5s timeout, 3 retries
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:3000/api/health || exit 1

# Use dumb-init to handle PID 1 and signal forwarding
ENTRYPOINT ["dumb-init", "--", "/app/docker-entrypoint.sh"]
