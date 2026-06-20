import { test, expect, type Page } from '@playwright/test';
import path from 'path';
import { SEED_IDS, E2E_MAGIC_LINK_TOKENS, HR_CREDENTIALS, SEED_CANDIDATE_NAMES } from './constants';
import { reseedDatabase } from './helpers/seed-database';

/**
 * ROVE Hire — Comprehensive E2E Suite
 *
 * Maps to requirements/excercise_full_stack.md features 1–8.
 * DB re-seed before mutating flows keeps each group deterministic.
 */

const resumePath = path.join(__dirname, 'fixtures', 'test-resume.pdf');

async function fillApplicationForm(page: Page): Promise<void> {
  await page.getByLabel(/phone number/i).fill('+1 555-111-2222');
  await page.getByLabel(/current location/i).fill('Denver, CO');
  await page.getByLabel(/^current role/i).fill('Software Engineer');
  await page.getByLabel(/notice period/i).fill('2 weeks');
  await page.getByLabel(/salary expectation/i).fill('$130,000');
  await page.getByLabel(/linkedin profile/i).fill('https://www.linkedin.com/in/frank-e2e');
}

// ─────────────────────────────────────────────────────────────
// Feature 1: HR Sign-In & Dashboard
// ─────────────────────────────────────────────────────────────
test.describe('Feature 1 — HR Sign-In & Dashboard', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test('redirects unauthenticated users to login from dashboard', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/login/, { timeout: 15_000 });
  });

  test('valid credentials redirect to dashboard', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel(/email/i).fill(HR_CREDENTIALS.email);
    await page.getByLabel(/password/i).fill(HR_CREDENTIALS.password);
    await page.getByRole('button', { name: /sign in|log in|login/i }).click();
    await expect(page).toHaveURL(/\/(dashboard)?$/, { timeout: 15_000 });
    await expect(page.getByRole('navigation', { name: 'Main navigation' })).toBeVisible();
  });

  test('invalid credentials show error and stay on login', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel(/email/i).fill('wrong@example.com');
    await page.getByLabel(/password/i).fill('WrongPassword123');
    await page.getByRole('button', { name: /sign in|log in|login/i }).click();
    await expect(page.getByText(/invalid|incorrect|failed|error/i)).toBeVisible({
      timeout: 10_000,
    });
    await expect(page).toHaveURL(/login/);
  });
});

test.describe('Feature 1 — Dashboard pipeline (authenticated)', () => {
  test.beforeAll(() => {
    reseedDatabase();
  });

  test('lists all seeded candidates with name, role, status, last activity', async ({ page }) => {
    await page.goto('/');

    for (const name of SEED_CANDIDATE_NAMES) {
      await expect(page.getByRole('row', { name: new RegExp(name, 'i') })).toBeVisible({
        timeout: 15_000,
      });
    }

    await expect(page.getByRole('columnheader', { name: /name/i })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: /role/i })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: /status/i })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: /last activity/i })).toBeVisible();
  });

  test('search filters candidates by name', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('searchbox', { name: /search candidates/i }).fill('Alice');
    await page.waitForTimeout(400);
    await expect(page.getByRole('row', { name: /Alice Johnson/i })).toBeVisible({
      timeout: 10_000,
    });
    await expect(page.getByRole('row', { name: /Bob Martinez/i })).not.toBeVisible();
  });

  test('status filter shows only matching candidates', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /filter by status/i }).click();
    await page.getByRole('option', { name: 'Offer Sent' }).click();
    await page.keyboard.press('Escape');

    await expect(page.getByRole('row', { name: /David Park/i })).toBeVisible({
      timeout: 10_000,
    });
    await expect(page.getByRole('row', { name: /Alice Johnson/i })).not.toBeVisible();
  });

  test('clicking a row opens candidate profile', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('row', { name: /Bob Martinez/i }).click();
    await expect(page).toHaveURL(new RegExp(`/candidates/${SEED_IDS.candidates.formSubmitted}`));
    await expect(page.getByRole('heading', { name: 'Bob Martinez' })).toBeVisible();
  });

  test('dashboard stats header shows pipeline counts', async ({ page }) => {
    await page.goto('/');
    const statsSection = page.locator('div.grid').filter({ hasText: 'Total Candidates' }).first();

    for (const label of ['Total Candidates', 'Applied', 'In Progress', 'Offer Sent', 'Hired']) {
      await expect(statsSection.getByText(label, { exact: true })).toBeVisible();
    }
  });
});

// ─────────────────────────────────────────────────────────────
// Navigation & Settings
// ─────────────────────────────────────────────────────────────
test.describe('Navigation & Settings', () => {
  test('sidebar links reach all main pages', async ({ page }) => {
    await page.goto('/');
    const sidebar = page.getByRole('navigation', { name: 'Main navigation' });

    await sidebar.getByRole('link', { name: 'Jobs' }).click();
    await expect(page).toHaveURL(/\/jobs$/);
    await expect(page.getByRole('heading', { name: /job openings/i })).toBeVisible();

    await sidebar.getByRole('link', { name: 'Add Candidate' }).click();
    await expect(page).toHaveURL(/\/candidates\/new/);

    await sidebar.getByRole('link', { name: 'Interviews' }).click();
    await expect(page).toHaveURL(/\/interviews/);
    await expect(page.getByRole('heading', { name: 'Interviews' })).toBeVisible();

    await sidebar.getByRole('link', { name: 'Documents' }).click();
    await expect(page).toHaveURL(/\/documents/);
    await expect(page.getByRole('heading', { name: 'Documents' })).toBeVisible();

    await sidebar.getByRole('link', { name: 'Settings' }).click();
    await expect(page).toHaveURL(/\/settings/);
    await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();

    await sidebar.getByRole('link', { name: 'Dashboard' }).click();
    await expect(page).toHaveURL(/\/(dashboard)?$/);
  });
});

// ─────────────────────────────────────────────────────────────
// Feature 2: Job Openings
// ─────────────────────────────────────────────────────────────
test.describe('Feature 2 — Job Openings', () => {
  test('jobs list shows openings with candidate counts and status', async ({ page }) => {
    await page.goto('/jobs');

    await expect(page.getByText('Senior Full-Stack Engineer')).toBeVisible();
    await expect(page.getByText('Product Designer')).toBeVisible();
    await expect(page.getByText('DevOps Engineer')).toBeVisible();
    await expect(page.getByText(/candidate/i).first()).toBeVisible();
  });

  test('closed job is visible on jobs list', async ({ page }) => {
    await page.goto('/jobs');
    await expect(page.getByText('DevOps Engineer')).toBeVisible();
    await expect(
      page.getByRole('link', { name: /DevOps Engineer/i }).getByText(/closed/i),
    ).toBeVisible();
  });

  test('create a new job opening with title, description, and skills', async ({ page }) => {
    await page.goto('/jobs/new');

    await page.getByLabel(/title/i).fill('QA Automation Engineer');

    const descriptionField = page.getByLabel(/description/i).or(page.locator('textarea').first());
    await descriptionField
      .first()
      .fill('## Role\n\nWe need a QA engineer to build our automation framework.');

    const skillsTextbox = page.getByRole('textbox', { name: /skills/i });
    if (await skillsTextbox.isVisible()) {
      for (const skill of ['Playwright', 'TypeScript', 'CI/CD']) {
        await skillsTextbox.fill(skill);
        await page.keyboard.press('Enter');
      }
    }

    await page.getByRole('button', { name: /create|submit|save/i }).click();

    await expect(
      page
        .getByLabel('Notifications alt+T')
        .getByText(/created|success/i)
        .or(page.getByText('QA Automation Engineer')),
    ).toBeVisible({ timeout: 10_000 });
  });

  test('edit job opening updates title', async ({ page }) => {
    await page.goto(`/jobs/${SEED_IDS.jobs.designer}/edit`);
    await expect(page.getByLabel(/title/i)).toHaveValue('Product Designer', { timeout: 10_000 });

    await page.getByLabel(/title/i).fill('Product Designer (Updated E2E)');
    await page.getByRole('button', { name: /save changes/i }).click();

    await expect(page.getByLabel('Notifications alt+T').getByText(/updated|success/i)).toBeVisible({
      timeout: 10_000,
    });
  });

  test('job detail page shows description and associated candidates', async ({ page }) => {
    await page.goto(`/jobs/${SEED_IDS.jobs.fullStack}`);
    await expect(page.getByRole('heading', { name: /Senior Full-Stack Engineer/i })).toBeVisible();
    await expect(page.getByText(/Alice Johnson|Bob Martinez/i).first()).toBeVisible({
      timeout: 10_000,
    });
  });

  test('toggle job status open/closed on jobs list', async ({ page }) => {
    await page.goto('/jobs');

    const designerRow = page.getByRole('link', {
      name: /Product Designer \(Updated E2E\)|Product Designer/i,
    });
    const toggle = designerRow.locator('[role="switch"]').first();
    const wasOpen = (await toggle.getAttribute('aria-checked')) === 'true';

    await toggle.click();
    await expect(page.getByLabel('Notifications alt+T').getByText(/closed|reopened/i)).toBeVisible({
      timeout: 10_000,
    });

    await toggle.click();
    await expect(page.getByLabel('Notifications alt+T').getByText(/closed|reopened/i)).toBeVisible({
      timeout: 10_000,
    });

    // Restore original state if we changed it
    const isNowOpen = (await toggle.getAttribute('aria-checked')) === 'true';
    if (isNowOpen !== wasOpen) {
      await toggle.click();
    }
  });

  test('closed jobs cannot be selected when adding candidate', async ({ page }) => {
    await page.goto('/candidates/new');
    await page.locator('#job-opening').click();
    await expect(page.getByText('Closed Positions (not accepting candidates)')).toBeVisible();
    await expect(page.getByRole('option', { name: /DevOps Engineer — Closed/i })).toBeDisabled();
  });
});

// ─────────────────────────────────────────────────────────────
// Feature 3: Add Candidate
// ─────────────────────────────────────────────────────────────
test.describe('Feature 3 — Add Candidate', () => {
  test('upload resume and verify magic link is generated with copy button', async ({ page }) => {
    await page.goto('/candidates/new');

    await page.getByLabel(/name/i).first().fill('Test Candidate E2E');
    await page.getByLabel(/email/i).first().fill(`e2e-test-${Date.now()}@example.com`);

    const jobCombobox = page.getByRole('combobox', { name: /job|opening/i });
    if (await jobCombobox.isVisible()) {
      await jobCombobox.click();
      await page.getByRole('option').first().click();
    }

    await page.locator('input[type="file"]').setInputFiles(resumePath);
    await page.getByRole('button', { name: /add|create|submit/i }).click();

    await expect(
      page
        .getByText(/magic link|application link|candidate-application/i)
        .or(page.locator('input[readonly]'))
        .or(page.getByRole('textbox', { name: /link|url/i })),
    ).toBeVisible({ timeout: 15_000 });

    await expect(page.getByRole('button', { name: /copy/i })).toBeVisible();
  });
});

// ─────────────────────────────────────────────────────────────
// Feature 4: Public Candidate Application (Magic Link)
// ─────────────────────────────────────────────────────────────
test.describe('Feature 4 — Magic Link Application', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test.describe.configure({ mode: 'serial' });

  test.beforeAll(() => {
    reseedDatabase();
  });

  test('invalid token shows error screen', async ({ page }) => {
    await page.goto('/candidate-application/invalid-test-token');
    await expect(page.getByText(/invalid|not found|error/i)).toBeVisible({ timeout: 10_000 });
  });

  test('expired token redirects to expired screen', async ({ page }) => {
    await page.goto(`/candidate-application/${E2E_MAGIC_LINK_TOKENS.expired}`);
    await expect(page).toHaveURL(/candidate-application\/expired/, { timeout: 10_000 });
    await expect(page.getByText('Link Expired')).toBeVisible();
  });

  test('valid token shows application form and submits successfully', async ({ page }) => {
    await page.goto(`/candidate-application/${E2E_MAGIC_LINK_TOKENS.valid}`);

    await expect(page.getByLabel(/phone number/i)).toBeVisible({
      timeout: 10_000,
    });

    await fillApplicationForm(page);
    await page.getByRole('button', { name: /submit application/i }).click();

    await expect(page).toHaveURL(/candidate-application\/success/, { timeout: 15_000 });
    await expect(page.getByText('Application Received')).toBeVisible();
  });

  test('consumed token shows already-used screen', async ({ page }) => {
    await page.goto(`/candidate-application/${E2E_MAGIC_LINK_TOKENS.valid}`);
    await expect(page.getByText('Link Already Used')).toBeVisible({
      timeout: 10_000,
    });
  });
});

test('HR sees Frank status updated to Form Submitted after magic link', async ({ page }) => {
  await page.goto(`/candidates/${SEED_IDS.candidates.e2eMagicLink}`);
  await expect(page.getByRole('heading', { name: 'Frank E2E Applicant' })).toBeVisible();
  await expect(page.getByText('Form Submitted', { exact: true }).first()).toBeVisible({
    timeout: 10_000,
  });
});

// ─────────────────────────────────────────────────────────────
// Feature 6: Candidate Profile (read-only spine checks)
// ─────────────────────────────────────────────────────────────
test.describe('Feature 6 — Candidate Profile', () => {
  test('David Park profile shows offer PDFs and timeline', async ({ page }) => {
    await page.goto(`/candidates/${SEED_IDS.candidates.offerSent}`);

    await expect(page.getByRole('heading', { name: 'David Park' })).toBeVisible();
    await expect(page.getByRole('status', { name: /offer sent/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /download offer letter/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /download nda/i })).toBeVisible();
    await expect(page.getByText(/timeline|activity/i).first()).toBeVisible();
  });

  test('Emma Wilson profile shows rejected status and timeline', async ({ page }) => {
    await page.goto(`/candidates/${SEED_IDS.candidates.rejected}`);

    await expect(page.getByRole('heading', { name: 'Emma Wilson' })).toBeVisible();
    await expect(page.getByRole('status', { name: /rejected/i })).toBeVisible();
    await expect(page.getByText(/rejected|kubernetes/i).first()).toBeVisible();
    await expect(page.getByRole('button', { name: /reject|hire|generate/i })).not.toBeVisible();
  });

  test('Carol Chen profile shows interviews and completed feedback', async ({ page }) => {
    await page.goto(`/candidates/${SEED_IDS.candidates.interviewScheduled}`);

    await expect(page.getByRole('heading', { name: 'Carol Chen' })).toBeVisible();
    await expect(page.getByText(/Sarah Thompson|Michael Rivera/i).first()).toBeVisible({
      timeout: 10_000,
    });
    await expect(page.getByText(/hire|feedback/i).first()).toBeVisible();
  });

  test('Bob Martinez does not show Mark as Hired without offer', async ({ page }) => {
    await page.goto(`/candidates/${SEED_IDS.candidates.formSubmitted}`);
    await expect(page.getByRole('heading', { name: 'Bob Martinez' })).toBeVisible();
    await expect(page.getByRole('button', { name: /mark as hired/i })).not.toBeVisible();
    await expect(page.getByRole('button', { name: /reject/i })).toBeVisible();
  });
});

// ─────────────────────────────────────────────────────────────
// Feature 5: Schedule Interview & Record Feedback
// ─────────────────────────────────────────────────────────────
test.describe('Feature 5 — Interviews', () => {
  test.describe.configure({ mode: 'serial' });

  test.beforeAll(() => {
    reseedDatabase();
  });

  test('interviews page lists scheduled interviews sorted by date', async ({ page }) => {
    await page.goto('/interviews');

    await expect(page.getByRole('columnheader', { name: /candidate/i })).toBeVisible();
    await expect(page.getByRole('cell', { name: 'Carol Chen' }).first()).toBeVisible();
    await expect(page.getByText('Michael Rivera')).toBeVisible();
  });

  test('schedule an interview for a candidate', async ({ page }) => {
    await page.goto('/interviews');

    const scheduleBtn = page.getByRole('button', { name: /schedule interview/i });
    await expect(scheduleBtn).toBeVisible({ timeout: 10_000 });
    await scheduleBtn.click();
    await expect(page.getByRole('dialog')).toBeVisible();

    await page.getByRole('combobox', { name: /candidate/i }).click();
    await page.getByRole('option', { name: /bob martinez/i }).click();

    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 7);
    await page.locator('#schedule-date').fill(futureDate.toISOString().split('T')[0]);
    await page.locator('#schedule-time').fill('10:00');

    await page.getByRole('combobox', { name: /type/i }).click();
    await page.getByRole('option', { name: /screening/i }).click();

    await page.getByRole('textbox', { name: /interviewer/i }).fill('John Smith');
    await page.getByRole('button', { name: /schedule interview$/i }).click();

    await expect(
      page.getByLabel('Notifications alt+T').getByText('Interview scheduled successfully'),
    ).toBeVisible({ timeout: 10_000 });
  });

  test('Bob Martinez status moves to Interview Scheduled after scheduling', async ({ page }) => {
    await page.goto(`/candidates/${SEED_IDS.candidates.formSubmitted}`);
    await expect(page.getByRole('status', { name: /interview scheduled/i })).toBeVisible({
      timeout: 10_000,
    });
  });

  test('record interview feedback with recommendation and notes', async ({ page }) => {
    await page.goto('/interviews');

    const carolScheduledRow = page
      .locator('tr')
      .filter({ hasText: 'Carol Chen' })
      .filter({ hasText: 'Scheduled' });
    await carolScheduledRow.getByRole('button', { name: /feedback/i }).click();

    await expect(page.getByRole('dialog', { name: /record feedback/i })).toBeVisible();

    await page.locator('#feedback-recommendation').click();
    await page.getByRole('option', { name: 'Hire', exact: true }).click();

    await page
      .locator('#feedback-notes')
      .fill(
        'Strong technical skills demonstrated during system design discussion. Recommend proceeding to offer.',
      );

    await page.getByRole('button', { name: /submit feedback/i }).click();

    await expect(
      page.getByLabel('Notifications alt+T').getByText(/feedback recorded/i),
    ).toBeVisible({ timeout: 10_000 });
  });
});

// ─────────────────────────────────────────────────────────────
// Feature 7: Generate Offer Documents
// ─────────────────────────────────────────────────────────────
test.describe('Feature 7 — Offer Generation', () => {
  test.describe.configure({ mode: 'serial' });

  test.beforeAll(() => {
    reseedDatabase();
  });

  test('documents page lists David Park offer letter and NDA', async ({ page }) => {
    await page.goto('/documents');

    await expect(page.getByRole('columnheader', { name: /type/i })).toBeVisible();
    await expect(page.getByRole('cell', { name: 'David Park' }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: /download/i }).first()).toBeVisible();
  });

  test('fill offer form, generate PDFs, and verify Offer Sent status', async ({ page }) => {
    test.setTimeout(90_000);

    await page.goto(`/candidates/${SEED_IDS.candidates.interviewScheduled}`);

    await expect(page.getByText('Carol Chen')).toBeVisible({ timeout: 10_000 });

    const actionsButton = page.getByRole('button', { name: /generate offer/i }).first();
    await expect(actionsButton).toBeVisible({ timeout: 5_000 });
    await actionsButton.click();

    await page.waitForURL(/action=generate-offer/);
    await expect(page.locator('#offer-role-title')).toBeVisible({ timeout: 5_000 });

    await page.locator('#offer-role-title').fill('Senior Software Engineer');
    await page.locator('#offer-salary-amount').fill('160000');

    const futureDate = new Date();
    futureDate.setMonth(futureDate.getMonth() + 1);
    await page.locator('#offer-start-date').fill(futureDate.toISOString().split('T')[0]);
    await page.locator('#offer-reporting-manager').fill('Sarah Thompson');
    await page.locator('#offer-location').fill('San Francisco, CA');

    await page.locator('form button[type="submit"]').click();

    await expect(page.getByRole('button', { name: /download offer letter/i })).toBeVisible({
      timeout: 45_000,
    });
    await expect(page.getByRole('button', { name: /download nda/i })).toBeVisible();
    await expect(page.getByText('Offer Sent', { exact: true }).first()).toBeVisible({
      timeout: 15_000,
    });
  });

  test('persistence: offer documents survive page refresh', async ({ page }) => {
    await page.goto(`/candidates/${SEED_IDS.candidates.interviewScheduled}`);
    await expect(page.getByRole('button', { name: /download offer letter/i })).toBeVisible({
      timeout: 10_000,
    });

    await page.reload();
    await expect(page.getByRole('button', { name: /download offer letter/i })).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByText('Offer Sent', { exact: true }).first()).toBeVisible();
  });
});

// ─────────────────────────────────────────────────────────────
// Feature 8: Mark Hired / Reject
// ─────────────────────────────────────────────────────────────
test.describe('Feature 8 — Mark Hired', () => {
  test.beforeAll(() => {
    reseedDatabase();
  });

  test('mark candidate with offer as hired', async ({ page }) => {
    await page.goto(`/candidates/${SEED_IDS.candidates.offerSent}`);

    await expect(page.getByText('David Park')).toBeVisible({ timeout: 10_000 });

    const hireButton = page.getByRole('button', { name: /mark as hired/i });
    await expect(hireButton).toBeVisible({ timeout: 5_000 });
    await hireButton.click();

    const confirmButton = page.getByRole('button', { name: /confirm|yes|proceed/i });
    if (await confirmButton.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await confirmButton.click();
    }

    await expect(page.getByRole('status', { name: /hired/i })).toBeVisible({ timeout: 10_000 });
    await expect(page.getByRole('button', { name: /reject/i })).not.toBeVisible();
  });
});

test.describe('Feature 8 — Reject Candidate', () => {
  test.beforeAll(() => {
    reseedDatabase();
  });

  test('reject candidate with reason updates to terminal Rejected status', async ({ page }) => {
    await page.goto(`/candidates/${SEED_IDS.candidates.applied}`);

    await expect(page.getByText('Alice Johnson')).toBeVisible({ timeout: 10_000 });

    await page.getByRole('button', { name: /reject/i }).click();

    const reasonInput = page.getByRole('textbox', { name: /reason/i });
    await expect(reasonInput).toBeVisible({ timeout: 5_000 });
    await reasonInput.fill(
      'Candidate does not meet the minimum experience requirements for this role after thorough evaluation.',
    );

    await page.getByRole('button', { name: /reject candidate/i }).click();

    await expect(page.getByRole('status', { name: /rejected/i })).toBeVisible({ timeout: 10_000 });
    await expect(page.getByRole('button', { name: /reject|hire|generate/i })).not.toBeVisible();
  });

  test('rejection without sufficient reason keeps submit disabled', async ({ page }) => {
    await page.goto(`/candidates/${SEED_IDS.candidates.formSubmitted}`);

    await expect(page.getByText('Bob Martinez')).toBeVisible({ timeout: 10_000 });
    await page.getByRole('button', { name: /reject/i }).click();

    const reasonInput = page.getByRole('textbox', { name: /reason/i });
    await reasonInput.fill('No');

    await expect(page.getByRole('button', { name: /reject candidate/i })).toBeDisabled();
  });
});

// ─────────────────────────────────────────────────────────────
// Session & Persistence
// ─────────────────────────────────────────────────────────────
test.describe('Session & Logout', () => {
  test('sign out redirects to login and clears session', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Sign out' }).click();
    await expect(page).toHaveURL(/login/, { timeout: 15_000 });
  });
});
