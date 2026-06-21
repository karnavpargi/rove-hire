-- CreateEnum
CREATE TYPE "CandidateStatus" AS ENUM ('Applied', 'FormSubmitted', 'InterviewScheduled', 'OfferSent', 'Hired', 'Rejected');

-- CreateEnum
CREATE TYPE "JobOpeningStatus" AS ENUM ('Open', 'Closed');

-- CreateEnum
CREATE TYPE "InterviewType" AS ENUM ('Screening', 'Technical');

-- CreateEnum
CREATE TYPE "InterviewStatus" AS ENUM ('Scheduled', 'Completed', 'Cancelled');

-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('Resume', 'OfferLetter', 'Nda');

-- CreateEnum
CREATE TYPE "Recommendation" AS ENUM ('Hire', 'NoHire', 'Maybe');

-- CreateTable
CREATE TABLE "hr_users" (
    "id" TEXT NOT NULL,
    "email" VARCHAR(254) NOT NULL,
    "password_hash" TEXT NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "hr_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "is_invalidated" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "job_openings" (
    "id" TEXT NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "description" TEXT,
    "status" "JobOpeningStatus" NOT NULL DEFAULT 'Open',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "job_openings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "job_opening_skills" (
    "id" TEXT NOT NULL,
    "job_opening_id" TEXT NOT NULL,
    "tag" VARCHAR(50) NOT NULL,

    CONSTRAINT "job_opening_skills_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "candidates" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "email" VARCHAR(254) NOT NULL,
    "phone" VARCHAR(20),
    "location" VARCHAR(100),
    "current_role" VARCHAR(100),
    "notice_period" VARCHAR(50),
    "salary_expectation" VARCHAR(50),
    "linkedin_url" VARCHAR(255),
    "status" "CandidateStatus" NOT NULL DEFAULT 'Applied',
    "rejection_reason" VARCHAR(500),
    "job_opening_id" TEXT NOT NULL,
    "last_activity_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "candidates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "magic_links" (
    "id" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "candidate_id" TEXT NOT NULL,
    "is_consumed" BOOLEAN NOT NULL DEFAULT false,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "consumed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "magic_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "interviews" (
    "id" TEXT NOT NULL,
    "candidate_id" TEXT NOT NULL,
    "type" "InterviewType" NOT NULL,
    "scheduled_at" TIMESTAMP(3) NOT NULL,
    "interviewer_name" VARCHAR(100) NOT NULL,
    "notes" TEXT,
    "status" "InterviewStatus" NOT NULL DEFAULT 'Scheduled',
    "recommendation" "Recommendation",
    "feedback" TEXT,
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "interviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documents" (
    "id" TEXT NOT NULL,
    "candidate_id" TEXT NOT NULL,
    "type" "DocumentType" NOT NULL,
    "s3_key" TEXT NOT NULL,
    "original_filename" VARCHAR(255),
    "file_size_bytes" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "timeline_events" (
    "id" TEXT NOT NULL,
    "candidate_id" TEXT NOT NULL,
    "event_type" VARCHAR(50) NOT NULL,
    "previous_status" TEXT,
    "new_status" TEXT,
    "details" TEXT,
    "actor_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "timeline_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "login_attempts" (
    "id" TEXT NOT NULL,
    "source" VARCHAR(255) NOT NULL,
    "success" BOOLEAN NOT NULL,
    "attempted_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "login_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "hr_users_email_key" ON "hr_users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "magic_links_token_hash_key" ON "magic_links"("token_hash");

-- CreateIndex
CREATE UNIQUE INDEX "magic_links_candidate_id_key" ON "magic_links"("candidate_id");

-- CreateIndex
CREATE UNIQUE INDEX "candidates_email_job_opening_id_key" ON "candidates"("email", "job_opening_id");

-- CreateIndex: candidates.status
CREATE INDEX "candidates_status_idx" ON "candidates"("status");

-- CreateIndex: candidates.job_opening_id
CREATE INDEX "candidates_job_opening_id_idx" ON "candidates"("job_opening_id");

-- CreateIndex: candidates.last_activity_at (descending)
CREATE INDEX "candidates_last_activity_at_idx" ON "candidates"("last_activity_at" DESC);

-- CreateIndex: magic_links.token_hash
CREATE INDEX "magic_links_token_hash_idx" ON "magic_links"("token_hash");

-- CreateIndex: interviews.candidate_id
CREATE INDEX "interviews_candidate_id_idx" ON "interviews"("candidate_id");

-- CreateIndex: interviews.scheduled_at
CREATE INDEX "interviews_scheduled_at_idx" ON "interviews"("scheduled_at");

-- CreateIndex: timeline_events.(candidate_id, created_at DESC)
CREATE INDEX "timeline_events_candidate_id_created_at_idx" ON "timeline_events"("candidate_id", "created_at" DESC);

-- CreateIndex: login_attempts.(source, attempted_at)
CREATE INDEX "login_attempts_source_attempted_at_idx" ON "login_attempts"("source", "attempted_at");

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "hr_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_opening_skills" ADD CONSTRAINT "job_opening_skills_job_opening_id_fkey" FOREIGN KEY ("job_opening_id") REFERENCES "job_openings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidates" ADD CONSTRAINT "candidates_job_opening_id_fkey" FOREIGN KEY ("job_opening_id") REFERENCES "job_openings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "magic_links" ADD CONSTRAINT "magic_links_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "candidates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interviews" ADD CONSTRAINT "interviews_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "candidates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "candidates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "timeline_events" ADD CONSTRAINT "timeline_events_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "candidates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "timeline_events" ADD CONSTRAINT "timeline_events_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "hr_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- =============================================================================
-- Custom CHECK Constraints (not expressible in Prisma schema)
-- =============================================================================

-- CHECK: rejection_reason must be NOT NULL when status = 'Rejected'
-- This ensures data integrity for the candidate pipeline state machine.
ALTER TABLE "candidates"
  ADD CONSTRAINT "chk_candidates_rejection_reason_required"
  CHECK (
    (status != 'Rejected') OR (rejection_reason IS NOT NULL)
  );

-- CHECK: Skills array bounds (1-20 skills per job opening)
-- Since skills are stored in a separate table (job_opening_skills), we use a
-- trigger function to enforce the 1-20 skills constraint at the database level.

CREATE OR REPLACE FUNCTION check_job_opening_skills_bounds()
RETURNS TRIGGER AS $$
DECLARE
  skill_count INTEGER;
BEGIN
  -- On INSERT: check if adding this skill exceeds the maximum
  IF TG_OP = 'INSERT' THEN
    SELECT COUNT(*) INTO skill_count
    FROM "job_opening_skills"
    WHERE "job_opening_id" = NEW."job_opening_id";

    -- skill_count includes the row being inserted (AFTER trigger)
    IF skill_count > 20 THEN
      RAISE EXCEPTION 'Job opening cannot have more than 20 skills (currently: %)', skill_count
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;

  -- On DELETE: check if removing this skill goes below the minimum
  IF TG_OP = 'DELETE' THEN
    SELECT COUNT(*) INTO skill_count
    FROM "job_opening_skills"
    WHERE "job_opening_id" = OLD."job_opening_id";

    -- skill_count excludes the row being deleted (AFTER trigger)
    IF skill_count < 1 THEN
      RAISE EXCEPTION 'Job opening must have at least 1 skill (currently: %)', skill_count
        USING ERRCODE = 'check_violation';
    END IF;

    RETURN OLD;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "trg_job_opening_skills_bounds"
  AFTER INSERT OR DELETE ON "job_opening_skills"
  FOR EACH ROW
  EXECUTE FUNCTION check_job_opening_skills_bounds();
