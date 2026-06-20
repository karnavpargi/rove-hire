# ROVE Hire — Recruitment Management Tool

A full-stack recruitment management tool enabling ROVE's HR team to manage candidates end-to-end — from resume arrival through interview scheduling to offer letter generation. Built as a take-home exercise demonstrating production-grade architecture, security, and developer experience.

---

## Table of Contents

- [Tech Stack](#tech-stack)
- [Architecture Overview](#architecture-overview)
- [Getting Started](#getting-started)
- [Test Credentials](#test-credentials)
- [Seed Data](#seed-data)
- [PDF Generation](#pdf-generation)
- [Hosting & Deployment](#hosting--deployment)
- [Testing](#testing)
- [Known Issues](#known-issues)
- [What's Next](#whats-next)

---

## Tech Stack

| Layer              | Technology                    | Justification                                                                                 |
| ------------------ | ----------------------------- | --------------------------------------------------------------------------------------------- |
| **Frontend**       | Next.js 14+ (App Router)      | Server components, file-based routing, streaming SSR, excellent DX                            |
| **UI Framework**   | Tailwind CSS + Shadcn/UI      | Utility-first styling with accessible, composable primitives (Radix-based)                    |
| **Client State**   | TanStack Query + Zustand      | TanStack for server-state caching/sync; Zustand for minimal client state (cross-tab session)  |
| **Backend**        | NestJS + GraphQL (code-first) | Modular architecture with decorators, DI, guards; code-first ensures TS ↔ schema type safety  |
| **Database**       | PostgreSQL 16                 | ACID transactions, JSONB for timeline metadata, robust indexing, mature ecosystem             |
| **ORM**            | Prisma                        | Type-safe queries, declarative schema, migration system, excellent NestJS/GraphQL integration |
| **File Storage**   | AWS S3                        | Industry-standard object storage; pre-signed URLs for secure, time-limited downloads          |
| **PDF Generation** | Puppeteer (Chromium headless) | High-fidelity HTML/CSS rendering, full Unicode/emoji support, branded templates               |
| **Authentication** | JWT in HttpOnly cookies       | Prevents XSS token theft; SameSite=Lax mitigates CSRF; 8-hour expiry with bcrypt (cost 12)    |
| **Monorepo**       | Turborepo + pnpm workspaces   | Shared types/configs between apps; parallel builds; efficient dependency management           |
| **Hosting**        | Docker + Cloudflare Tunnel    | Zero-trust access without open ports; outbound-only connection to Cloudflare edge             |

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│  Browser                                                         │
│  Next.js Frontend (localhost:3001)                               │
└───────────────┬─────────────────────────────────────────────────┘
                │ GraphQL over HTTPS (HttpOnly JWT cookie)
                ▼
┌─────────────────────────────────────────────────────────────────┐
│  Cloudflare Tunnel (optional, for public access)                │
└───────────────┬─────────────────────────────────────────────────┘
                │
                ▼
┌─────────────────────────────────────────────────────────────────┐
│  Docker Host                                                     │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  NestJS API (port 3000)                                    │  │
│  │  • GraphQL (Apollo) • Auth • State Machine • PDF Gen       │  │
│  └──────────────────────┬────────────────────────────────────┘  │
│                          │ Prisma Client                         │
│  ┌───────────────────────▼───────────────────────────────────┐  │
│  │  PostgreSQL 16 (port 5432)                                 │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                │
                ▼  AWS SDK
┌─────────────────────────────────────────────────────────────────┐
│  AWS S3 (private bucket, no public access)                      │
│  Resumes, Offer Letters, NDAs — served via pre-signed URLs      │
└─────────────────────────────────────────────────────────────────┘
```

### Monorepo Structure

```
rove-hire/
├── apps/
│   ├── web/                # Next.js 14+ frontend (App Router)
│   │   ├── app/            # Pages & layouts
│   │   ├── components/     # UI components (Shadcn/UI based)
│   │   └── lib/            # Hooks, GraphQL client, stores
│   └── api/                # NestJS backend
│       ├── src/modules/    # Auth, Candidate, Job, Interview, Document, Timeline, MagicLink, File
│       ├── prisma/         # Schema, migrations, seed
│       ├── templates/      # HTML templates for PDF generation
│       └── Dockerfile      # Multi-stage build
├── packages/
│   └── shared/             # Shared TypeScript types, enums, validation schemas, state machine
├── docker-compose.yml      # PostgreSQL + API + Cloudflare Tunnel
├── turbo.json              # Build pipeline config
└── package.json            # Workspace root
```

---

## Getting Started

### Prerequisites

- **Node.js** 18+
- **pnpm** (package manager)
- **Docker** & **Docker Compose**

### Quick Start (Docker — recommended)

```bash
# 1. Clone and install dependencies
git clone <repo-url> && cd rove-hire
pnpm install

# 2. Copy environment file
cp .env.example .env

# 3. Start PostgreSQL + API via Docker
docker-compose up -d

# 4. Run database migrations
pnpm --filter api prisma:migrate

# 5. Seed the database
pnpm --filter api prisma:seed

# 6. Start the frontend
pnpm --filter web dev
```

After these steps:

- **Frontend**: http://localhost:3001
- **API / GraphQL Playground**: http://localhost:3000/graphql
- **Health check**: http://localhost:3000/api/health → `{"status":"ok"}`

### Development Mode (without Docker for API)

```bash
# 1. Start only PostgreSQL via Docker
docker-compose up -d postgres

# 2. Copy environment file (if not done)
cp .env.example .env

# 3. Install dependencies
pnpm install

# 4. Run migrations and seed
pnpm --filter api prisma:migrate
pnpm --filter api prisma:seed

# 5. Start backend (hot reload)
pnpm --filter api start:dev    # → localhost:3000

# 6. Start frontend (hot reload)
pnpm --filter web dev          # → localhost:3001
```

### Environment Variables

| Variable                | Default                   | Description                        |
| ----------------------- | ------------------------- | ---------------------------------- |
| `POSTGRES_USER`         | `rove_user`               | PostgreSQL username                |
| `POSTGRES_PASSWORD`     | `rove_password`           | PostgreSQL password                |
| `POSTGRES_DB`           | `rove_hire`               | Database name                      |
| `DB_PORT`               | `5432`                    | PostgreSQL port                    |
| `API_PORT`              | `3000`                    | NestJS API port                    |
| `JWT_SECRET`            | `change-me-in-production` | Secret for JWT signing             |
| `DATABASE_URL`          | (composed from above)     | Prisma connection string           |
| `AWS_REGION`            | `us-east-1`               | AWS region for S3                  |
| `AWS_ACCESS_KEY_ID`     | —                         | AWS credentials for S3             |
| `AWS_SECRET_ACCESS_KEY` | —                         | AWS credentials for S3             |
| `S3_BUCKET_NAME`        | `rove-hire-files`         | S3 bucket for file storage         |
| `FRONTEND_URL`          | `http://localhost:3001`   | CORS allowed origin                |
| `TUNNEL_TOKEN`          | —                         | Cloudflare Tunnel token (optional) |

---

## Test Credentials

The seed script creates a pre-configured HR user for evaluating the application:

| Field        | Value           |
| ------------ | --------------- |
| **Email**    | `hr@rove.com`   |
| **Password** | `RoveHire2024!` |

Log in at http://localhost:3001/login with these credentials.

---

## Seed Data

The database seed (`apps/api/prisma/seed.ts`) creates a realistic dataset for evaluation. It is **idempotent** — uses upsert patterns and can be re-run safely.

### Job Openings (3)

| Title                      | Status | Department  |
| -------------------------- | ------ | ----------- |
| Senior Full-Stack Engineer | Open   | Engineering |
| Product Designer           | Open   | Design      |
| Junior Developer           | Closed | Engineering |

### Candidates (5) — across all pipeline states

| Name          | Status             | Notes                                           |
| ------------- | ------------------ | ----------------------------------------------- |
| Alice Johnson | Applied            | Fresh application, resume uploaded              |
| Bob Martinez  | FormSubmitted      | Completed magic link form submission            |
| Carol Chen    | InterviewScheduled | Has completed screening interview with feedback |
| David Park    | OfferSent          | Offer letter + NDA documents generated          |
| Emily Wong    | Rejected           | Rejection reason recorded (min 10 chars)        |

### Additional Seed Data

- **Timeline Events**: Complete state history for each candidate (status changes, interview scheduling, feedback, offer generation, rejection)
- **Interviews**: Completed screening interview with recommendation/feedback for Carol Chen
- **Documents**: Mock S3 keys for David Park's offer letter and NDA
- **Magic Links**: Generated tokens for the candidate application flow

---

## PDF Generation

### Approach

Offer letters and NDAs are generated server-side using **Puppeteer** (headless Chromium). This approach was chosen for:

1. **High fidelity** — renders the same HTML/CSS a browser would, producing pixel-perfect PDFs
2. **Template flexibility** — standard HTML templates with dynamic field interpolation (no special DSL)
3. **Unicode support** — full font support including accents, CJK characters, and emoji
4. **Branded output** — ROVE-branded headers, styling, and signature blocks

### How It Works

```
Input (candidate data + offer details)
    ↓
Load HTML template (apps/api/templates/offer-letter.html or nda.html)
    ↓
Interpolate dynamic fields (name, role, salary, start date, etc.)
    ↓
Render with Puppeteer (headless Chrome) → PDF buffer
    ↓
Upload to S3 with UUID key path
    ↓
Create document record in database
    ↓
Return pre-signed download URL (15-min expiry)
```

### Templates

| Template            | Dynamic Fields                                                                                    |
| ------------------- | ------------------------------------------------------------------------------------------------- |
| `offer-letter.html` | Candidate name, role title, salary (with currency), start date, reporting manager, location, date |
| `nda.html`          | Candidate name, role title, location, date, confidentiality terms                                 |

### Constraints

- Both documents (offer + NDA) are generated atomically — if either fails, neither is persisted
- Generation completes within 10 seconds for documents up to 10 pages
- Fields handle text up to 500 characters without overflow
- Optional fields are omitted gracefully (no blank gaps)
- Candidate must have a completed interview with feedback before offer generation is allowed

---

## Hosting & Deployment

### Docker Compose Services

The `docker-compose.yml` runs three services:

| Service       | Image                           | Port | Purpose                        |
| ------------- | ------------------------------- | ---- | ------------------------------ |
| `postgres`    | `postgres:16-alpine`            | 5432 | Database with health checks    |
| `api`         | Custom (multi-stage build)      | 3000 | NestJS API server              |
| `cloudflared` | `cloudflare/cloudflared:latest` | —    | Tunnel for public HTTPS access |

### Cloudflare Tunnel

[Cloudflare Tunnel](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/) creates an outbound-only connection from your Docker host to Cloudflare's edge. No public IP or open ports required.

```
Internet → Cloudflare Edge → cloudflared container → api container (:3000)
```

**Setup:**

1. Create a tunnel in [Cloudflare Zero Trust dashboard](https://one.dash.cloudflare.com) → Networks → Tunnels
2. Configure ingress: public hostname (e.g., `api.yourdomain.com`) → service `http://api:3000`
3. Set `TUNNEL_TOKEN` in your `.env` file
4. Run `docker-compose up -d` — the tunnel starts automatically

**For local development**, the tunnel is optional. Access the API directly at `http://localhost:3000`.

### Production Considerations

- The API Dockerfile uses a multi-stage build (build → production) to minimize image size
- PostgreSQL data is persisted via a Docker volume (`postgres_data`)
- Health checks ensure the API starts only after PostgreSQL is ready
- Set a strong `JWT_SECRET` in production (not the default)

---

## Testing

```bash
# Run all unit + property-based tests
pnpm test

# Run tests for a specific workspace
pnpm --filter api test
pnpm --filter web test
pnpm --filter shared test

# Run end-to-end tests (Playwright)
pnpm test:e2e

# Run tests in watch mode
pnpm --filter api test:watch
```

### Test Categories

| Type                 | Framework           | Scope                                                      |
| -------------------- | ------------------- | ---------------------------------------------------------- |
| Unit tests           | Vitest              | Service logic, validation, state machine                   |
| Property-based tests | fast-check + Vitest | State transitions, validation boundaries, concurrency      |
| E2E tests            | Playwright          | Full user flows (login → create → schedule → offer → hire) |

### Property-Based Tests

The project uses property-based testing (PBT) to verify invariants hold across all valid inputs:

- **State machine**: valid/invalid transitions, terminal status immutability
- **Magic links**: token entropy, hash round-trip, one-time use, expiry
- **Validation**: email, phone, salary, LinkedIn URL, file upload constraints
- **Concurrency**: first-writer-wins on status transitions
- **Rate limiting**: lockout after N failures, window reset

---

## Known Issues

| Issue                            | Impact                                                      | Workaround                                                    |
| -------------------------------- | ----------------------------------------------------------- | ------------------------------------------------------------- |
| S3 requires real AWS credentials | File upload/download non-functional without valid keys      | Set `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` in `.env` |
| Cloudflare Tunnel requires token | Public access unavailable without Cloudflare account        | Use local development (localhost) for evaluation              |
| Puppeteer in Docker              | First PDF generation may be slow due to Chromium cold start | Subsequent generations are faster (Chromium stays warm)       |

---

## What's Next

Improvements planned for future iterations:

| Feature                       | Description                                                                             |
| ----------------------------- | --------------------------------------------------------------------------------------- |
| **Email notifications**       | Notify candidates on status changes (magic link sent, interview scheduled, offer ready) |
| **Role-based access control** | Multiple HR users with different permission levels (admin, recruiter, hiring manager)   |
| **Audit log**                 | Immutable append-only log of all system actions for compliance                          |
| **Performance monitoring**    | APM integration (OpenTelemetry) for request tracing and bottleneck identification       |
| **Calendar integration**      | Google Calendar / Outlook sync for interview scheduling                                 |
| **Bulk operations**           | Multi-select candidates for batch status changes or rejection                           |
| **Advanced search**           | Full-text search across resumes and candidate notes                                     |
| **Analytics dashboard**       | Pipeline conversion rates, time-to-hire metrics, bottleneck visualization               |

---

## License

Private — ROVE take-home exercise submission.
