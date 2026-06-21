# ROVE Hire — Recruitment Management Tool

A full-stack recruitment management tool enabling ROVE's HR team to manage candidates end-to-end — from resume arrival through interview scheduling to offer letter generation. Built as a take-home exercise demonstrating production-grade architecture, security, and developer experience.

## Test this app

|              |                             |
| ------------ | --------------------------- |
| **Link**     | https://rove.kpargi.eu.org/ |
| **User**     | `hr@rove.com`               |
| **Password** | `RoveHire2024!`             |

---

## Submission Notes

### How it is hosted

The app runs on a **local server** via Docker Compose (PostgreSQL, NestJS API, Next.js web). For evaluation, it is exposed publicly through a **Cloudflare Tunnel** (`cloudflared`), which proxies HTTPS traffic to the local frontend and API without opening inbound ports on the host.

### Tech stack and why

| Choice           | What we chose                     | Why it was the right call                                                                                                                                                                                                                                                                                                                                                  |
| ---------------- | --------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Backend**      | NestJS + GraphQL (code-first)     | Modular architecture with guards, DI, and decorators fits a multi-domain HR app (auth, candidates, interviews, documents). GraphQL lets the dashboard fetch exactly what each view needs in one round trip, and code-first schema generation keeps TypeScript types in sync with the API.                                                                                  |
| **Database**     | PostgreSQL 16 + Prisma            | Recruitment data is inherently relational — candidates, jobs, interviews, timeline events, and documents all have foreign-key integrity requirements. PostgreSQL gives ACID transactions (critical for atomic status transitions and offer generation), JSONB for flexible timeline metadata, and mature indexing. Prisma adds type-safe queries and a migration workflow. |
| **File storage** | AWS S3                            | Resumes and generated PDFs must persist and be re-downloadable. S3 is durable, cheap at this scale, and pre-signed URLs let us serve private files without exposing the bucket publicly.                                                                                                                                                                                   |
| **Hosting**      | Docker Compose on a local machine | Mandated by the exercise and ideal for a take-home: one command brings up the full stack reproducibly. Combined with `cloudflared`, it gives reviewers a live URL without deploying to a cloud provider.                                                                                                                                                                   |

See [Tech Stack](#tech-stack) below for the full layer breakdown (frontend, auth, PDF, monorepo tooling).

### PDF generation approach

Offer letters and NDAs are rendered from **Handlebars HTML templates** and converted to PDF with **Puppeteer** (headless Chromium). This gives browser-quality layout, full Unicode support, and easy template editing without a proprietary DSL.

**What we would change at scale:** Puppeteer launches a new Chromium instance per request today, which is fine for demo volume but not for production throughput. At scale we would move PDF generation to a **background worker queue** (e.g. BullMQ + Redis), maintain a **warm browser pool** instead of cold-starting Chromium, and consider a dedicated service like **Gotenberg** or a serverless headless-Chrome function to isolate memory-heavy rendering from the API process.

See [PDF Generation](#pdf-generation) for the full pipeline diagram and constraints.

### Anything that broke or felt off (not production-ready yet)

| Area                      | Issue                                                                                                                     | Why we would not ship it yet                                                                                                                                     |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **File storage fallback** | When S3 credentials are missing or upload fails, the API falls back to local `s3Key` paths and returns `#` download URLs. | Documents appear generated but are not actually downloadable. Production needs hard failure or a local disk fallback with real serving — not silent degradation. |
| **PDF generation**        | First Puppeteer run in Docker can be slow (Chromium cold start); each request spins up and tears down a browser.          | Needs a warm pool or async job queue before handling concurrent offer generation under load.                                                                     |
| **Email delivery**        | No outbound email — magic links and offer notifications are manual.                                                       | Core to a real hiring workflow; without it HR must copy/paste links.                                                                                             |
| **Single HR user**        | Seed creates one account; no invite flow or RBAC.                                                                         | Real teams need multiple users with different access levels.                                                                                                     |
| **HTTPS cookie config**   | `COOKIE_SECURE` and `ENABLE_HSTS` default to `false` for local dev.                                                       | Must be enabled and URLs updated when served through the Cloudflare Tunnel in production-like evaluation.                                                        |

---

## Table of Contents

- [Test this app](#test-this-app)
- [Submission Notes](#submission-notes)
- [Tech Stack](#tech-stack)
- [Architecture Overview](#architecture-overview)
- [Getting Started](#getting-started)
- [Test Credentials](#test-credentials)
- [Seed Data](#seed-data)
- [PDF Generation](#pdf-generation)
- [Hosting & Deployment](#hosting--deployment)
- [Testing](#testing)
- [Known Issues](#known-issues)

---

## Tech Stack

| Layer              | Technology                                 | Justification                                                                                                        |
| ------------------ | ------------------------------------------ | -------------------------------------------------------------------------------------------------------------------- |
| **Frontend**       | Next.js 14+ (App Router)                   | Server components, file-based routing, streaming SSR, excellent DX                                                   |
| **UI Framework**   | Tailwind CSS + Shadcn/UI                   | Utility-first styling with accessible, composable primitives (Radix-based)                                           |
| **Client State**   | TanStack Query + Zustand + graphql-request | TanStack for server-state caching; Zustand for session UI state; graphql-request for typed GraphQL mutations/queries |
| **Backend**        | NestJS + GraphQL (code-first)              | Modular architecture with decorators, DI, guards; code-first ensures TS ↔ schema type safety                         |
| **Database**       | PostgreSQL 16                              | ACID transactions, JSONB for timeline metadata, robust indexing, mature ecosystem                                    |
| **ORM**            | Prisma                                     | Type-safe queries, declarative schema, migration system, excellent NestJS/GraphQL integration                        |
| **File Storage**   | AWS S3                                     | Industry-standard object storage; pre-signed URLs for secure, time-limited downloads                                 |
| **PDF Generation** | Puppeteer (Chromium headless)              | High-fidelity HTML/CSS rendering, full Unicode/emoji support, branded templates                                      |
| **Authentication** | JWT in HttpOnly cookies                    | Prevents XSS token theft; SameSite=Lax mitigates CSRF; 8-hour expiry with bcrypt (cost 12)                           |
| **Monorepo**       | Turborepo + pnpm workspaces                | Shared types/configs between apps; parallel builds; efficient dependency management                                  |
| **Hosting**        | Docker Compose + cloudflared               | Local full-stack via `docker-compose.yml`; public access proxied through a Cloudflare Tunnel                         |

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│  Browser                                                         │
│  Next.js Frontend (localhost:3001)                               │
└───────────────┬─────────────────────────────────────────────────┘
                │ GraphQL over HTTP (HttpOnly JWT cookie)
                ▼
┌─────────────────────────────────────────────────────────────────┐
│  Docker Compose                                                  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  NestJS API (port 3000)                                    │  │
│  │  • GraphQL (Apollo) • Auth • State Machine • PDF Gen       │  │
│  └──────────────────────┬────────────────────────────────────┘  │
│                          │ Prisma Client                         │
│  ┌───────────────────────▼───────────────────────────────────┐  │
│  │  PostgreSQL 16 (port 5432)                                 │  │
│  └───────────────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  Next.js Web (port 3001)                                   │  │
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
│   │   └── src/
│   │       ├── app/        # Pages & layouts
│   │       ├── components/ # UI components (Shadcn/UI based)
│   │       ├── hooks/      # Data-fetching and UI hooks
│   │       ├── lib/        # GraphQL client, utilities
│   │       └── stores/     # Zustand client state
│   └── api/                # NestJS backend
│       ├── src/modules/    # Auth, Candidate, Job, Interview, Document, Timeline, MagicLink, File
│       ├── prisma/         # Schema, migrations, seed
│       ├── templates/      # HTML templates for PDF generation
│       └── Dockerfile      # Multi-stage build
├── packages/
│   └── shared/             # Shared TypeScript types, enums, validation schemas, state machine
├── docker-compose.yml      # Full stack: PostgreSQL, API, web (+ db-setup profile)
├── docker-compose.dev.yml  # Optional dev override (API hot reload)
├── turbo.json              # Build pipeline config
└── package.json            # Workspace root
```

---

## Getting Started

### Prerequisites

- **Node.js** 20+ (matches Docker base image)
- **pnpm** (package manager)
- **Docker** & **Docker Compose**

### Quick Start (Docker)

```bash
# 1. Clone and install dependencies
git clone <repo-url> && cd <repo-dir>
pnpm install

# 2. Copy environment file
cp .env.example .env

# 3. Initialize database (migrations + seed)
pnpm docker:setup

# 4. Start the full stack
pnpm docker:up
```

After these steps:

- **Frontend**: http://localhost:3001
- **API (GraphQL endpoint)**: http://localhost:3000/graphql
- **Health check**: http://localhost:3000/api/health → `{"status":"ok"}`

GraphQL Playground is **disabled** in the production Docker API (`NODE_ENV=production`). Use [Development Mode](#development-mode-api-in-docker-web-with-hot-reload) below to access the playground at http://localhost:3000/graphql.

### Development Mode (API in Docker, web with hot reload)

```bash
cp .env.example .env
pnpm install
pnpm docker:setup
pnpm docker:dev
pnpm --filter @rove-hire/web dev   # → http://localhost:3001 (API playground at :3000/graphql)
```

The dev override sets `NODE_ENV=development` on the API container, which enables GraphQL Playground. The web dev server runs on port **3001** to avoid conflicting with the API on port **3000**.

### Environment Variables

| Variable                  | Default                         | Description                               |
| ------------------------- | ------------------------------- | ----------------------------------------- |
| `POSTGRES_USER`           | `rove_user`                     | PostgreSQL username                       |
| `POSTGRES_PASSWORD`       | `rove_password`                 | PostgreSQL password                       |
| `POSTGRES_DB`             | `rove_hire`                     | Database name                             |
| `DB_PORT`                 | `5432`                          | PostgreSQL host port                      |
| `API_PORT`                | `3000`                          | NestJS API host port                      |
| `WEB_PORT`                | `3001`                          | Next.js frontend host port                |
| `JWT_SECRET`              | `change-me-in-production`       | Secret for JWT signing                    |
| `FRONTEND_URL`            | `http://localhost:3001`         | CORS allowed origin                       |
| `NEXT_PUBLIC_GRAPHQL_URL` | `http://localhost:3000/graphql` | GraphQL endpoint baked into the web image |
| `COOKIE_SECURE`           | `false`                         | Set `true` when serving over HTTPS        |
| `ENABLE_HSTS`             | `false`                         | Set `true` when serving over HTTPS        |
| `AWS_REGION`              | `us-east-1`                     | AWS region for S3                         |
| `AWS_ACCESS_KEY_ID`       | —                               | AWS credentials for S3                    |
| `AWS_SECRET_ACCESS_KEY`   | —                               | AWS credentials for S3                    |
| `S3_BUCKET_NAME`          | `rove-hire-files`               | S3 bucket for file storage                |

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

| Title                      | Status | Key skills                                         |
| -------------------------- | ------ | -------------------------------------------------- |
| Senior Full-Stack Engineer | Open   | TypeScript, React, Node.js, PostgreSQL, AWS        |
| Product Designer           | Open   | Figma, User Research, Prototyping, Design Systems  |
| DevOps Engineer            | Closed | Kubernetes, Terraform, AWS, Docker, GitHub Actions |

### Candidates (5) — across all pipeline states

| Name          | Status             | Notes                                               |
| ------------- | ------------------ | --------------------------------------------------- |
| Alice Johnson | Applied            | Fresh application, resume uploaded                  |
| Bob Martinez  | FormSubmitted      | Completed magic link form submission                |
| Carol Chen    | InterviewScheduled | Completed screening interview + scheduled technical |
| David Park    | OfferSent          | Offer letter + NDA documents generated              |
| Emma Wilson   | Rejected           | Rejection reason recorded (min 10 chars)            |

### Additional Seed Data

- **Timeline Events**: Complete state history for each candidate (status changes, interview scheduling, feedback, offer generation, rejection)
- **Interviews**: Completed screening + scheduled technical interview for Carol Chen
- **Documents**: Mock S3 keys for David Park's offer letter and NDA
- **Magic Links**: E2E test tokens for Frank E2E Applicant (valid) and Grace Expired Link (expired)

---

## PDF Generation

### Approach

Offer letters and NDAs are generated server-side using **Handlebars** templates and **Puppeteer** (headless Chromium). This approach was chosen for:

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

Exercise targets (enforced by validation and service logic where applicable):

- Both documents (offer + NDA) are generated atomically — if either fails, neither is persisted
- Generation completes within 10 seconds for documents up to 10 pages
- Fields handle text up to 500 characters without overflow
- Optional fields are omitted gracefully (no blank gaps)
- Candidate must have a completed interview with feedback before offer generation is allowed

### At scale

For higher volume we would decouple PDF rendering from the API request path: enqueue generation jobs, reuse a Chromium browser pool, and optionally swap Puppeteer for a dedicated PDF service (Gotenberg, AWS Lambda + headless Chrome, or a managed document API). Templates would move to a versioned store so legal can update offer/NDA wording without redeploying the API.

---

## Hosting & Deployment

The stack runs on a **local server** using **Docker Compose**. Public evaluation access is provided by **Cloudflare Tunnel** (`cloudflared`), which forwards HTTPS to the local web (port 3001) and API (port 3000) without exposing the host to inbound traffic.

Configuration lives in `.env` (from `.env.example`) and `docker-compose.yml`.

### Commands

| Command             | Description                                         |
| ------------------- | --------------------------------------------------- |
| `pnpm docker:setup` | Run migrations and seed (first time or reset)       |
| `pnpm docker:up`    | Build and start postgres, API, and web containers   |
| `pnpm docker:down`  | Stop and remove containers                          |
| `pnpm docker:logs`  | Follow container logs                               |
| `pnpm docker:dev`   | Start postgres + API with hot reload (dev override) |

### Services

| Service    | Image / build         | Default port | Purpose                     |
| ---------- | --------------------- | ------------ | --------------------------- |
| `postgres` | `postgres:16-alpine`  | 5432         | Database with health checks |
| `api`      | `apps/api/Dockerfile` | 3000         | NestJS GraphQL API          |
| `web`      | `apps/web/Dockerfile` | 3001         | Next.js frontend            |

The API container runs Prisma migrations on startup. Use `pnpm docker:setup` once to apply migrations and load seed data (HR user, jobs, candidates).

### Cloudflare Tunnel (public access)

When exposing the local stack for review:

1. Start the stack: `pnpm docker:up`
2. Run `cloudflared tunnel --url http://localhost:3001` (or point a named tunnel at both web and API origins)
3. Update `.env` with the tunnel hostname: set `FRONTEND_URL`, `NEXT_PUBLIC_GRAPHQL_URL`, `COOKIE_SECURE=true`, and `ENABLE_HSTS=true`, then rebuild

### Production notes

- Set strong values for `POSTGRES_PASSWORD` and `JWT_SECRET` in `.env`.
- When serving over HTTPS (including via cloudflared), set `FRONTEND_URL`, `NEXT_PUBLIC_GRAPHQL_URL`, `COOKIE_SECURE=true`, and `ENABLE_HSTS=true`, then rebuild: `pnpm docker:up`.
- PostgreSQL data persists in the `postgres_data` Docker volume.
- Health checks ensure the API starts only after PostgreSQL is ready, and the web container waits for a healthy API.

---

## Testing

```bash
# Run all unit + property-based tests
pnpm test

# Run tests for a specific workspace
pnpm --filter @rove-hire/api test
pnpm --filter @rove-hire/web test
pnpm --filter @rove-hire/shared test

# Run API integration tests (requires running Postgres)
pnpm --filter @rove-hire/api test:integration

# Run end-to-end tests (Playwright)
pnpm test:e2e

# Run tests in watch mode (Vitest)
pnpm --filter @rove-hire/api exec vitest
pnpm --filter @rove-hire/web exec vitest
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

See [Anything that broke or felt off](#anything-that-broke-or-felt-off-not-production-ready-yet) in Submission Notes for the full production-readiness assessment. Quick reference:

| Issue                            | Impact                                                                             | Workaround                                                    |
| -------------------------------- | ---------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| S3 requires real AWS credentials | File upload/download non-functional without valid keys                             | Set `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` in `.env` |
| S3 fallback when upload fails    | Documents saved with local keys; download URLs return `#`                          | Configure valid S3 credentials; do not rely on fallback       |
| Puppeteer in Docker              | Each PDF request launches and tears down Chromium; first run in Docker can be slow | Expect ~3–10s per generation; needs a browser pool at scale   |
| No email delivery                | Magic links and offers must be shared manually                                     | Copy link from the HR dashboard                               |

---

## License

Private — ROVE take-home exercise submission.
