/**
 * ROVE Hire — Database Seed Script
 *
 * Seeds the database with:
 * - 1 HR user (hr@rove.com / RoveHire2024!)
 * - 3 Job openings (different departments, Open/Closed)
 * - 5 Candidates across all pipeline states
 * - Interviews with feedback for InterviewScheduled candidate
 * - Documents (mock S3 keys) for OfferSent candidate
 * - Rejection reason for Rejected candidate
 * - Timeline events reflecting complete state history
 *
 * Idempotent: uses upsert pattern so it can be re-run safely.
 */

import { createHash } from 'crypto';
import {
  PrismaClient,
  CandidateStatus,
  JobOpeningStatus,
  InterviewType,
  InterviewStatus,
  DocumentType,
  Recommendation,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';

/** Deterministic tokens for Playwright E2E — plaintext never stored, only SHA-256 hash. */
const E2E_MAGIC_LINK_TOKENS = {
  valid: 'e2e-valid-magic-link-token-rove-hire-2026',
  expired: 'e2e-expired-magic-link-token-rove-hire-2026',
} as const;

function hashMagicLinkToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

const prisma = new PrismaClient();

// ─────────────────────────────────────────────────────────────
// Deterministic IDs for idempotent upserts
// ─────────────────────────────────────────────────────────────
const IDS = {
  hrUser: '00000000-0000-4000-a000-000000000001',
  jobs: {
    fullStack: '00000000-0000-4000-b000-000000000001',
    designer: '00000000-0000-4000-b000-000000000002',
    devOps: '00000000-0000-4000-b000-000000000003',
  },
  candidates: {
    applied: '00000000-0000-4000-c000-000000000001',
    formSubmitted: '00000000-0000-4000-c000-000000000002',
    interviewScheduled: '00000000-0000-4000-c000-000000000003',
    offerSent: '00000000-0000-4000-c000-000000000004',
    rejected: '00000000-0000-4000-c000-000000000005',
    e2eMagicLink: '00000000-0000-4000-c000-000000000006',
    e2eExpiredLink: '00000000-0000-4000-c000-000000000007',
  },
  magicLinks: {
    e2eValid: '00000000-0000-4000-f000-000000000001',
    e2eExpired: '00000000-0000-4000-f000-000000000002',
  },
  interviews: {
    screening: '00000000-0000-4000-d000-000000000001',
    technical: '00000000-0000-4000-d000-000000000002',
  },
  documents: {
    resume: '00000000-0000-4000-e000-000000000001',
    offerLetter: '00000000-0000-4000-e000-000000000002',
    nda: '00000000-0000-4000-e000-000000000003',
  },
} as const;

async function main() {
  console.log('🌱 Seeding ROVE Hire database...\n');

  const seedCandidateIds = Object.values(IDS.candidates);

  // Remove candidates/jobs created by prior E2E runs (not in deterministic seed set)
  const orphanCandidates = await prisma.candidate.findMany({
    where: { id: { notIn: seedCandidateIds } },
    select: { id: true },
  });
  const orphanCandidateIds = orphanCandidates.map((c) => c.id);

  if (orphanCandidateIds.length > 0) {
    await prisma.timelineEvent.deleteMany({ where: { candidateId: { in: orphanCandidateIds } } });
    await prisma.magicLink.deleteMany({ where: { candidateId: { in: orphanCandidateIds } } });
    await prisma.interview.deleteMany({ where: { candidateId: { in: orphanCandidateIds } } });
    await prisma.document.deleteMany({ where: { candidateId: { in: orphanCandidateIds } } });
    await prisma.candidate.deleteMany({ where: { id: { in: orphanCandidateIds } } });
    console.log(`🧹 Removed ${orphanCandidateIds.length} orphan candidate(s) from prior E2E runs`);
  }

  // ─────────────────────────────────────────────────────────────
  // 1. HR User
  // ─────────────────────────────────────────────────────────────
  const passwordHash = await bcrypt.hash('RoveHire2024!', 12);

  const hrUser = await prisma.hrUser.upsert({
    where: { id: IDS.hrUser },
    update: { passwordHash, name: 'HR Admin', email: 'hr@rove.com' },
    create: {
      id: IDS.hrUser,
      email: 'hr@rove.com',
      passwordHash,
      name: 'HR Admin',
    },
  });
  console.log(`✅ HR User: ${hrUser.email} (password: RoveHire2024!)`);

  // ─────────────────────────────────────────────────────────────
  // 2. Job Openings (3 positions, different departments)
  // ─────────────────────────────────────────────────────────────
  const jobData = [
    {
      id: IDS.jobs.fullStack,
      title: 'Senior Full-Stack Engineer',
      description:
        '## About the Role\n\nWe are looking for a Senior Full-Stack Engineer to join our platform team. You will work on building scalable web applications using React, Node.js, and PostgreSQL.\n\n## Responsibilities\n\n- Design and implement new features\n- Mentor junior engineers\n- Participate in architecture decisions',
      status: JobOpeningStatus.Open,
      skills: ['TypeScript', 'React', 'Node.js', 'PostgreSQL', 'AWS'],
    },
    {
      id: IDS.jobs.designer,
      title: 'Product Designer',
      description:
        '## About the Role\n\nJoin our design team to craft beautiful, accessible user experiences for our internal tools and client-facing products.\n\n## Responsibilities\n\n- Create wireframes and high-fidelity designs\n- Conduct user research and usability testing\n- Collaborate with engineers on implementation',
      status: JobOpeningStatus.Open,
      skills: ['Figma', 'User Research', 'Prototyping', 'Design Systems', 'Accessibility'],
    },
    {
      id: IDS.jobs.devOps,
      title: 'DevOps Engineer',
      description:
        '## About the Role\n\nWe need a DevOps Engineer to improve our CI/CD pipelines, infrastructure automation, and observability stack.\n\n## Responsibilities\n\n- Manage Kubernetes clusters\n- Build and maintain CI/CD pipelines\n- Implement monitoring and alerting',
      status: JobOpeningStatus.Closed,
      skills: ['Kubernetes', 'Terraform', 'AWS', 'Docker', 'GitHub Actions'],
    },
  ];

  for (const job of jobData) {
    const { skills, ...jobFields } = job;

    await prisma.jobOpening.upsert({
      where: { id: jobFields.id },
      update: {
        title: jobFields.title,
        description: jobFields.description,
        status: jobFields.status,
      },
      create: jobFields,
    });

    // Upsert skills: compute diff and apply safely (trigger prevents 0 skills)
    const existingSkills = await prisma.jobOpeningSkill.findMany({
      where: { jobOpeningId: jobFields.id },
      select: { tag: true },
    });
    const existingTags = new Set(existingSkills.map((s) => s.tag));
    const newTags = new Set(skills);

    const tagsToAdd = skills.filter((t) => !existingTags.has(t));
    const tagsToRemove = existingSkills.filter((s) => !newTags.has(s.tag)).map((s) => s.tag);

    // Add new skills first so we never drop to 0
    if (tagsToAdd.length > 0) {
      await prisma.jobOpeningSkill.createMany({
        data: tagsToAdd.map((tag) => ({
          jobOpeningId: jobFields.id,
          tag,
        })),
      });
    }

    // Then remove stale skills (trigger ensures at least 1 remains)
    if (tagsToRemove.length > 0) {
      await prisma.jobOpeningSkill.deleteMany({
        where: {
          jobOpeningId: jobFields.id,
          tag: { in: tagsToRemove },
        },
      });
    }

    console.log(`✅ Job Opening: ${jobFields.title} [${jobFields.status}]`);
  }

  // ─────────────────────────────────────────────────────────────
  // 3. Candidates (5 across all pipeline states)
  // ─────────────────────────────────────────────────────────────
  const now = new Date();

  const candidateData = [
    {
      id: IDS.candidates.applied,
      name: 'Alice Johnson',
      email: 'alice.johnson@example.com',
      status: CandidateStatus.Applied,
      jobOpeningId: IDS.jobs.fullStack,
      lastActivityAt: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
    },
    {
      id: IDS.candidates.formSubmitted,
      name: 'Bob Martinez',
      email: 'bob.martinez@example.com',
      phone: '+1 555-234-5678',
      location: 'Austin, TX',
      currentRole: 'Frontend Developer',
      noticePeriod: '2 weeks',
      salaryExpectation: '$120,000 - $140,000',
      linkedinUrl: 'https://www.linkedin.com/in/bob-martinez',
      status: CandidateStatus.FormSubmitted,
      jobOpeningId: IDS.jobs.fullStack,
      lastActivityAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
    },
    {
      id: IDS.candidates.interviewScheduled,
      name: 'Carol Chen',
      email: 'carol.chen@example.com',
      phone: '+1 555-345-6789',
      location: 'San Francisco, CA',
      currentRole: 'Senior Software Engineer',
      noticePeriod: '1 month',
      salaryExpectation: '$150,000 - $180,000',
      linkedinUrl: 'https://www.linkedin.com/in/carol-chen',
      status: CandidateStatus.InterviewScheduled,
      jobOpeningId: IDS.jobs.designer,
      lastActivityAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
    },
    {
      id: IDS.candidates.offerSent,
      name: 'David Park',
      email: 'david.park@example.com',
      phone: '+1 555-456-7890',
      location: 'New York, NY',
      currentRole: 'Lead Product Designer',
      noticePeriod: '3 weeks',
      salaryExpectation: '$140,000 - $160,000',
      linkedinUrl: 'https://www.linkedin.com/in/david-park',
      status: CandidateStatus.OfferSent,
      jobOpeningId: IDS.jobs.designer,
      lastActivityAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
    },
    {
      id: IDS.candidates.e2eMagicLink,
      name: 'Frank E2E Applicant',
      email: 'frank.e2e@example.com',
      status: CandidateStatus.Applied,
      jobOpeningId: IDS.jobs.fullStack,
      lastActivityAt: new Date(now.getTime() - 12 * 60 * 60 * 1000),
    },
    {
      id: IDS.candidates.e2eExpiredLink,
      name: 'Grace Expired Link',
      email: 'grace.expired@example.com',
      status: CandidateStatus.Applied,
      jobOpeningId: IDS.jobs.fullStack,
      lastActivityAt: new Date(now.getTime() - 48 * 60 * 60 * 1000),
    },
    {
      id: IDS.candidates.rejected,
      name: 'Emma Wilson',
      email: 'emma.wilson@example.com',
      phone: '+1 555-567-8901',
      location: 'Seattle, WA',
      currentRole: 'DevOps Engineer',
      noticePeriod: '2 weeks',
      salaryExpectation: '$130,000 - $150,000',
      linkedinUrl: 'https://www.linkedin.com/in/emma-wilson',
      status: CandidateStatus.Rejected,
      rejectionReason:
        'Candidate did not meet the required experience level for Kubernetes and Terraform. We recommend applying again after gaining more hands-on infrastructure experience.',
      jobOpeningId: IDS.jobs.fullStack,
      lastActivityAt: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
    },
  ];

  for (const candidate of candidateData) {
    await prisma.candidate.upsert({
      where: { id: candidate.id },
      update: {
        name: candidate.name,
        email: candidate.email,
        phone: candidate.phone ?? null,
        location: candidate.location ?? null,
        currentRole: candidate.currentRole ?? null,
        noticePeriod: candidate.noticePeriod ?? null,
        salaryExpectation: candidate.salaryExpectation ?? null,
        linkedinUrl: candidate.linkedinUrl ?? null,
        status: candidate.status,
        rejectionReason: candidate.rejectionReason ?? null,
        jobOpeningId: candidate.jobOpeningId,
        lastActivityAt: candidate.lastActivityAt,
      },
      create: candidate,
    });
    console.log(`✅ Candidate: ${candidate.name} [${candidate.status}]`);
  }

  // ─────────────────────────────────────────────────────────────
  // 4. Interviews (for InterviewScheduled candidate — Carol Chen)
  // ─────────────────────────────────────────────────────────────
  await prisma.interview.upsert({
    where: { id: IDS.interviews.screening },
    update: {
      type: InterviewType.Screening,
      scheduledAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
      interviewerName: 'Sarah Thompson',
      notes: 'Initial phone screening to assess cultural fit and communication skills.',
      status: InterviewStatus.Completed,
      recommendation: Recommendation.Hire,
      feedback:
        'Carol demonstrated excellent communication skills and deep technical knowledge. She articulated her experience with design systems clearly and showed genuine passion for accessibility. Strong cultural fit with our team values. Recommend proceeding to technical interview.',
      completedAt: new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000),
      candidateId: IDS.candidates.interviewScheduled,
    },
    create: {
      id: IDS.interviews.screening,
      candidateId: IDS.candidates.interviewScheduled,
      type: InterviewType.Screening,
      scheduledAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
      interviewerName: 'Sarah Thompson',
      notes: 'Initial phone screening to assess cultural fit and communication skills.',
      status: InterviewStatus.Completed,
      recommendation: Recommendation.Hire,
      feedback:
        'Carol demonstrated excellent communication skills and deep technical knowledge. She articulated her experience with design systems clearly and showed genuine passion for accessibility. Strong cultural fit with our team values. Recommend proceeding to technical interview.',
      completedAt: new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000),
    },
  });

  await prisma.interview.upsert({
    where: { id: IDS.interviews.technical },
    update: {
      type: InterviewType.Technical,
      scheduledAt: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000),
      interviewerName: 'Michael Rivera',
      notes: 'Technical deep-dive: system design and live coding exercise.',
      status: InterviewStatus.Scheduled,
      recommendation: null,
      feedback: null,
      completedAt: null,
      candidateId: IDS.candidates.interviewScheduled,
    },
    create: {
      id: IDS.interviews.technical,
      candidateId: IDS.candidates.interviewScheduled,
      type: InterviewType.Technical,
      scheduledAt: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000),
      interviewerName: 'Michael Rivera',
      notes: 'Technical deep-dive: system design and live coding exercise.',
      status: InterviewStatus.Scheduled,
    },
  });
  console.log('✅ Interviews: Screening (Completed) + Technical (Scheduled) for Carol Chen');

  // ─────────────────────────────────────────────────────────────
  // 4b. E2E Magic Links (valid + expired tokens for Playwright)
  // ─────────────────────────────────────────────────────────────
  await prisma.magicLink.upsert({
    where: { candidateId: IDS.candidates.e2eMagicLink },
    update: {
      tokenHash: hashMagicLinkToken(E2E_MAGIC_LINK_TOKENS.valid),
      expiresAt: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000),
      isConsumed: false,
      consumedAt: null,
    },
    create: {
      id: IDS.magicLinks.e2eValid,
      tokenHash: hashMagicLinkToken(E2E_MAGIC_LINK_TOKENS.valid),
      candidateId: IDS.candidates.e2eMagicLink,
      expiresAt: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000),
      isConsumed: false,
    },
  });

  await prisma.magicLink.upsert({
    where: { candidateId: IDS.candidates.e2eExpiredLink },
    update: {
      tokenHash: hashMagicLinkToken(E2E_MAGIC_LINK_TOKENS.expired),
      expiresAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
      isConsumed: false,
      consumedAt: null,
    },
    create: {
      id: IDS.magicLinks.e2eExpired,
      tokenHash: hashMagicLinkToken(E2E_MAGIC_LINK_TOKENS.expired),
      candidateId: IDS.candidates.e2eExpiredLink,
      expiresAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
      isConsumed: false,
    },
  });
  console.log('✅ E2E Magic Links: valid (Frank) + expired (Grace)');

  // ─────────────────────────────────────────────────────────────
  // 5. Documents (for OfferSent candidate — David Park)
  // ─────────────────────────────────────────────────────────────
  await prisma.document.upsert({
    where: { id: IDS.documents.resume },
    update: {
      candidateId: IDS.candidates.offerSent,
      type: DocumentType.Resume,
      s3Key: 'resumes/00000000-0000-4000-c000-000000000004/david-park-resume.pdf',
      originalFilename: 'david-park-resume.pdf',
      fileSizeBytes: 245_760,
    },
    create: {
      id: IDS.documents.resume,
      candidateId: IDS.candidates.offerSent,
      type: DocumentType.Resume,
      s3Key: 'resumes/00000000-0000-4000-c000-000000000004/david-park-resume.pdf',
      originalFilename: 'david-park-resume.pdf',
      fileSizeBytes: 245_760,
    },
  });

  await prisma.document.upsert({
    where: { id: IDS.documents.offerLetter },
    update: {
      candidateId: IDS.candidates.offerSent,
      type: DocumentType.OfferLetter,
      s3Key: 'documents/offers/00000000-0000-4000-c000-000000000004/offer-letter.pdf',
      originalFilename: 'offer-letter-david-park.pdf',
      fileSizeBytes: 128_512,
    },
    create: {
      id: IDS.documents.offerLetter,
      candidateId: IDS.candidates.offerSent,
      type: DocumentType.OfferLetter,
      s3Key: 'documents/offers/00000000-0000-4000-c000-000000000004/offer-letter.pdf',
      originalFilename: 'offer-letter-david-park.pdf',
      fileSizeBytes: 128_512,
    },
  });

  await prisma.document.upsert({
    where: { id: IDS.documents.nda },
    update: {
      candidateId: IDS.candidates.offerSent,
      type: DocumentType.Nda,
      s3Key: 'documents/ndas/00000000-0000-4000-c000-000000000004/nda.pdf',
      originalFilename: 'nda-david-park.pdf',
      fileSizeBytes: 98_304,
    },
    create: {
      id: IDS.documents.nda,
      candidateId: IDS.candidates.offerSent,
      type: DocumentType.Nda,
      s3Key: 'documents/ndas/00000000-0000-4000-c000-000000000004/nda.pdf',
      originalFilename: 'nda-david-park.pdf',
      fileSizeBytes: 98_304,
    },
  });
  console.log('✅ Documents: Resume + Offer Letter + NDA for David Park');

  // ─────────────────────────────────────────────────────────────
  // 6. Timeline Events (complete state history for each candidate)
  // ─────────────────────────────────────────────────────────────

  // Clear existing timeline events for seed candidates (idempotent)
  await prisma.timelineEvent.deleteMany({
    where: {
      candidateId: {
        in: Object.values(IDS.candidates),
      },
    },
  });

  const timelineEvents = [
    // Frank E2E — Applied (magic link E2E)
    {
      candidateId: IDS.candidates.e2eMagicLink,
      eventType: 'status_change',
      previousStatus: null,
      newStatus: 'Applied',
      details: 'Candidate added for E2E magic link testing.',
      actorId: IDS.hrUser,
      createdAt: new Date(now.getTime() - 12 * 60 * 60 * 1000),
    },

    // Alice Johnson — Applied
    {
      candidateId: IDS.candidates.applied,
      eventType: 'status_change',
      previousStatus: null,
      newStatus: 'Applied',
      details: 'Candidate added to the system with resume uploaded.',
      actorId: IDS.hrUser,
      createdAt: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000),
    },

    // Bob Martinez — Applied → FormSubmitted
    {
      candidateId: IDS.candidates.formSubmitted,
      eventType: 'status_change',
      previousStatus: null,
      newStatus: 'Applied',
      details: 'Candidate added to the system with resume uploaded.',
      actorId: IDS.hrUser,
      createdAt: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
    },
    {
      candidateId: IDS.candidates.formSubmitted,
      eventType: 'application_submitted',
      previousStatus: 'Applied',
      newStatus: 'FormSubmitted',
      details: 'Candidate completed the application form via magic link.',
      actorId: null,
      createdAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000),
    },

    // Carol Chen — Applied → FormSubmitted → InterviewScheduled
    {
      candidateId: IDS.candidates.interviewScheduled,
      eventType: 'status_change',
      previousStatus: null,
      newStatus: 'Applied',
      details: 'Candidate added to the system with resume uploaded.',
      actorId: IDS.hrUser,
      createdAt: new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000),
    },
    {
      candidateId: IDS.candidates.interviewScheduled,
      eventType: 'application_submitted',
      previousStatus: 'Applied',
      newStatus: 'FormSubmitted',
      details: 'Candidate completed the application form via magic link.',
      actorId: null,
      createdAt: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000),
    },
    {
      candidateId: IDS.candidates.interviewScheduled,
      eventType: 'interview_scheduled',
      previousStatus: 'FormSubmitted',
      newStatus: 'InterviewScheduled',
      details: 'Screening interview scheduled with Sarah Thompson.',
      actorId: IDS.hrUser,
      createdAt: new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000),
    },
    {
      candidateId: IDS.candidates.interviewScheduled,
      eventType: 'feedback_submitted',
      previousStatus: null,
      newStatus: null,
      details:
        'Screening interview completed. Recommendation: Hire. Feedback recorded by Sarah Thompson.',
      actorId: IDS.hrUser,
      createdAt: new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000),
    },
    {
      candidateId: IDS.candidates.interviewScheduled,
      eventType: 'interview_scheduled',
      previousStatus: null,
      newStatus: null,
      details: 'Technical interview scheduled with Michael Rivera.',
      actorId: IDS.hrUser,
      createdAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
    },

    // David Park — Applied → FormSubmitted → InterviewScheduled → OfferSent
    {
      candidateId: IDS.candidates.offerSent,
      eventType: 'status_change',
      previousStatus: null,
      newStatus: 'Applied',
      details: 'Candidate added to the system with resume uploaded.',
      actorId: IDS.hrUser,
      createdAt: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
    },
    {
      candidateId: IDS.candidates.offerSent,
      eventType: 'application_submitted',
      previousStatus: 'Applied',
      newStatus: 'FormSubmitted',
      details: 'Candidate completed the application form via magic link.',
      actorId: null,
      createdAt: new Date(now.getTime() - 25 * 24 * 60 * 60 * 1000),
    },
    {
      candidateId: IDS.candidates.offerSent,
      eventType: 'interview_scheduled',
      previousStatus: 'FormSubmitted',
      newStatus: 'InterviewScheduled',
      details: 'Technical interview scheduled with design team lead.',
      actorId: IDS.hrUser,
      createdAt: new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000),
    },
    {
      candidateId: IDS.candidates.offerSent,
      eventType: 'feedback_submitted',
      previousStatus: null,
      newStatus: null,
      details:
        'Technical interview completed. Recommendation: Hire. Outstanding design portfolio and system thinking.',
      actorId: IDS.hrUser,
      createdAt: new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000),
    },
    {
      candidateId: IDS.candidates.offerSent,
      eventType: 'offer_generated',
      previousStatus: 'InterviewScheduled',
      newStatus: 'OfferSent',
      details: 'Offer letter and NDA generated. Role: Lead Product Designer, Salary: $155,000 USD.',
      actorId: IDS.hrUser,
      createdAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
    },

    // Emma Wilson — Applied → FormSubmitted → InterviewScheduled → Rejected
    {
      candidateId: IDS.candidates.rejected,
      eventType: 'status_change',
      previousStatus: null,
      newStatus: 'Applied',
      details: 'Candidate added to the system with resume uploaded.',
      actorId: IDS.hrUser,
      createdAt: new Date(now.getTime() - 21 * 24 * 60 * 60 * 1000),
    },
    {
      candidateId: IDS.candidates.rejected,
      eventType: 'application_submitted',
      previousStatus: 'Applied',
      newStatus: 'FormSubmitted',
      details: 'Candidate completed the application form via magic link.',
      actorId: null,
      createdAt: new Date(now.getTime() - 18 * 24 * 60 * 60 * 1000),
    },
    {
      candidateId: IDS.candidates.rejected,
      eventType: 'interview_scheduled',
      previousStatus: 'FormSubmitted',
      newStatus: 'InterviewScheduled',
      details: 'Screening interview scheduled with HR team.',
      actorId: IDS.hrUser,
      createdAt: new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000),
    },
    {
      candidateId: IDS.candidates.rejected,
      eventType: 'rejection_recorded',
      previousStatus: 'InterviewScheduled',
      newStatus: 'Rejected',
      details:
        'Candidate did not meet the required experience level for Kubernetes and Terraform. We recommend applying again after gaining more hands-on infrastructure experience.',
      actorId: IDS.hrUser,
      createdAt: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
    },
  ];

  await prisma.timelineEvent.createMany({
    data: timelineEvents,
  });
  console.log(`✅ Timeline Events: ${timelineEvents.length} events created across all candidates`);

  // ─────────────────────────────────────────────────────────────
  // Done
  // ─────────────────────────────────────────────────────────────
  console.log('\n🎉 Seed completed successfully!');
  console.log('─────────────────────────────────────────');
  console.log('Test Credentials:');
  console.log('  Email:    hr@rove.com');
  console.log('  Password: RoveHire2024!');
  console.log('─────────────────────────────────────────');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
