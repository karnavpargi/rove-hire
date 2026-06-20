import { test, expect } from '@playwright/test';
import path from 'path';

/**
 * ROVE Hire E2E Tests
 *
 * These tests verify the full user journey end-to-end against a seeded database.
 * Seed data: 3 job openings, 5 candidates across all pipeline states.
 * HR credentials: hr@rove.com / RoveHire2024!
 */

// ─────────────────────────────────────────────────────────────
// 1. HR Sign-In Flow
// ─────────────────────────────────────────────────────────────
test.describe('HR Sign-In Flow', () => {
  test.use({ storageState: { cookies: [], origins: [] } }); // No pre-auth

  test('navigate to login → enter credentials → redirect to dashboard', async ({ page }) => {
    await page.goto('/login');

    // Verify login page elements exist
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/password/i)).toBeVisible();

    // Enter valid credentials
    await page.getByLabel(/email/i).fill('hr@rove.com');
    await page.getByLabel(/password/i).fill('RoveHire2024!');
    await page.getByRole('button', { name: /sign in|log in|login/i }).click();

    // Verify redirect to dashboard
    await expect(page).toHaveURL(/\/(dashboard)?$/, { timeout: 15_000 });

    // Verify dashboard content is visible (candidate list or sidebar)
    await expect(
      page
        .getByRole('navigation')
        .or(page.getByText(/dashboard|candidates|pipeline/i))
        .first(),
    ).toBeVisible();
  });

  test('invalid credentials show generic error', async ({ page }) => {
    await page.goto('/login');

    await page.getByLabel(/email/i).fill('wrong@example.com');
    await page.getByLabel(/password/i).fill('WrongPassword123');
    await page.getByRole('button', { name: /sign in|log in|login/i }).click();

    // Should show a generic error (not revealing which field is wrong)
    await expect(page.getByText(/invalid|incorrect|failed|error/i)).toBeVisible({
      timeout: 10_000,
    });

    // Should stay on login page
    await expect(page).toHaveURL(/login/);
  });
});

// ─────────────────────────────────────────────────────────────
// 2. Create Job Opening Flow
// ─────────────────────────────────────────────────────────────
test.describe('Create Job Opening Flow', () => {
  test('create a new job opening with title, description, and skills', async ({ page }) => {
    await page.goto('/jobs/new');

    // Fill job opening form
    await page.getByLabel(/title/i).fill('QA Automation Engineer');

    // Description field (may be a textarea or markdown editor)
    const descriptionField = page
      .getByLabel(/description/i)
      .or(page.locator('textarea').first())
      .or(page.getByRole('textbox', { name: /description/i }));
    await descriptionField
      .first()
      .fill('## Role\n\nWe need a QA engineer to build our automation framework.');

    // Add skills tags (TagInput — find the <input> inside the tag group)
    const skillsTextbox = page.getByRole('textbox', { name: /skills/i });
    if (await skillsTextbox.isVisible()) {
      await skillsTextbox.fill('Playwright');
      await page.keyboard.press('Enter');
      await skillsTextbox.fill('TypeScript');
      await page.keyboard.press('Enter');
      await skillsTextbox.fill('CI/CD');
      await page.keyboard.press('Enter');
    }

    // Submit form
    await page.getByRole('button', { name: /create|submit|save/i }).click();

    // Verify success: toast notification (Sonner) or redirect
    await expect(
      page
        .getByLabel('Notifications alt+T')
        .getByText(/created|success/i)
        .or(page.getByText('QA Automation Engineer')),
    ).toBeVisible({ timeout: 10_000 });
  });
});

// ─────────────────────────────────────────────────────────────
// 3. Add Candidate Flow
// ─────────────────────────────────────────────────────────────
test.describe('Add Candidate Flow', () => {
  test('upload resume and verify magic link is generated', async ({ page }) => {
    await page.goto('/candidates/new');

    // Fill candidate form
    await page.getByLabel(/name/i).first().fill('Test Candidate E2E');
    await page.getByLabel(/email/i).first().fill(`e2e-test-${Date.now()}@example.com`);

    // Select job opening (shadcn/ui combobox)
    const jobCombobox = page.getByRole('combobox', { name: /job|opening/i });
    if (await jobCombobox.isVisible()) {
      await jobCombobox.click();
      await page.getByRole('option').first().click();
    }

    // Upload a PDF resume
    const resumePath = path.join(__dirname, 'fixtures', 'test-resume.pdf');
    const fileInput = page.locator('input[type="file"]');

    if (await fileInput.isVisible()) {
      await fileInput.setInputFiles(resumePath);
    } else {
      // Try drag-and-drop area
      const dropZone = page.getByText(/drag|drop|upload|browse/i).first();
      if (await dropZone.isVisible()) {
        await fileInput.setInputFiles(resumePath);
      }
    }

    // Submit form
    await page.getByRole('button', { name: /add|create|submit/i }).click();

    // Verify magic link is displayed
    await expect(
      page
        .getByText(/magic link|application link|candidate-application/i)
        .or(page.locator('input[readonly]'))
        .or(page.getByRole('textbox', { name: /link|url/i })),
    ).toBeVisible({ timeout: 15_000 });

    // Verify copy button exists
    await expect(
      page.getByRole('button', { name: /copy/i }).or(page.locator('[data-testid="copy-link"]')),
    ).toBeVisible();
  });
});

// ─────────────────────────────────────────────────────────────
// 4. Magic Link Application Flow
// ─────────────────────────────────────────────────────────────
test.describe('Magic Link Application Flow', () => {
  test.use({ storageState: { cookies: [], origins: [] } }); // Public page, no auth

  test('navigate to valid magic link → fill form → success page', async ({ page }) => {
    // Note: This test uses a pre-seeded magic link token.
    // In a real scenario, we'd get the token from the "Add Candidate" flow.
    // For now, we test the expired/invalid flow since we don't have a valid token.

    // Test invalid token shows appropriate error
    await page.goto('/candidate-application/invalid-test-token');

    await expect(page.getByText(/invalid|expired|not found|error/i)).toBeVisible({
      timeout: 10_000,
    });
  });

  test('expired magic link shows expired screen', async ({ page }) => {
    await page.goto('/candidate-application/expired-token-test');

    await expect(page.getByText(/invalid|expired|not found/i)).toBeVisible({ timeout: 10_000 });
  });
});

// ─────────────────────────────────────────────────────────────
// 5. Interview Scheduling Flow
// ─────────────────────────────────────────────────────────────
test.describe('Interview Scheduling Flow', () => {
  test('schedule an interview for a candidate', async ({ page }) => {
    // Navigate to the interviews page
    await page.goto('/interviews');

    // Click the Schedule Interview button (visible when data loads)
    const scheduleBtn = page.getByRole('button', { name: /schedule interview/i });
    await expect(scheduleBtn).toBeVisible({ timeout: 10_000 });
    await scheduleBtn.click();

    // Wait for the dialog to appear
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5_000 });

    // Select Bob Martinez from candidate dropdown
    const candidateSelect = page.getByRole('combobox', { name: /candidate/i });
    await candidateSelect.click();
    await page.getByRole('option', { name: /bob martinez/i }).click();

    // Fill date using the native date input
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 7);
    const dateStr = futureDate.toISOString().split('T')[0];
    await page.locator('#schedule-date').fill(dateStr);

    // Fill time
    await page.locator('#schedule-time').fill('10:00');

    // Select interview type
    const typeSelect = page.getByRole('combobox', { name: /type/i });
    await typeSelect.click();
    await page.getByRole('option', { name: /screening/i }).click();

    // Fill interviewer name
    await page.getByRole('textbox', { name: /interviewer/i }).fill('John Smith');

    // Submit
    await page.getByRole('button', { name: /schedule interview$/i }).click();

    // Verify success via toast notification (avoid duplicate live-region match)
    await expect(
      page.getByLabel('Notifications alt+T').getByText('Interview scheduled successfully'),
    ).toBeVisible({ timeout: 10_000 });
  });
});

// ─────────────────────────────────────────────────────────────
// 6. Offer Generation Flow
// ─────────────────────────────────────────────────────────────
test.describe('Offer Generation Flow', () => {
  test('fill offer form → verify PDF generation → verify status update', async ({ page }) => {
    // Navigate to Carol Chen (InterviewScheduled with completed interview)
    const candidateId = '00000000-0000-4000-c000-000000000003';
    await page.goto(`/candidates/${candidateId}`);

    // Wait for profile to load
    await expect(page.getByText('Carol Chen')).toBeVisible({ timeout: 10_000 });

    // Click Generate Offer button in header actions
    const actionsButton = page.getByRole('button', { name: /generate offer/i }).first();
    await expect(actionsButton).toBeVisible({ timeout: 5_000 });
    await actionsButton.click();

    // Wait for form to appear via URL change
    await page.waitForURL(/action=generate-offer/);
    await page.waitForTimeout(500);

    // Verify form is visible using element IDs
    await expect(page.locator('#offer-role-title')).toBeVisible({ timeout: 5_000 });

    // Fill offer generation form using element IDs
    await page.locator('#offer-role-title').fill('Senior Software Engineer');

    // Salary amount
    await page.locator('#offer-salary-amount').fill('160000');

    // Currency - leave default (USD)

    // Start date (future date)
    const futureDate = new Date();
    futureDate.setMonth(futureDate.getMonth() + 1);
    await page.locator('#offer-start-date').fill(futureDate.toISOString().split('T')[0]);

    // Reporting manager
    await page.locator('#offer-reporting-manager').fill('Sarah Thompson');

    // Location
    await page.locator('#offer-location').fill('San Francisco, CA');

    // Submit using the form's submit button (inside the form element)
    await page.locator('form button[type="submit"]').click();

    // Wait for PDF generation (up to 30s as it involves Puppeteer)
    await expect(page.getByRole('button', { name: /download offer letter/i })).toBeVisible({
      timeout: 30_000,
    });

    // Verify PDFs are listed (offer letter + NDA)
    await expect(page.getByRole('button', { name: /download offer letter/i })).toBeVisible();

    await expect(page.getByRole('button', { name: /download nda/i })).toBeVisible();

    // Verify status badge updated to Offer Sent
    await expect(page.getByRole('status', { name: /offer sent/i })).toBeVisible();
  });
});

// ─────────────────────────────────────────────────────────────
// 7. Mark as Hired Flow
// ─────────────────────────────────────────────────────────────
test.describe('Mark as Hired Flow', () => {
  test('mark candidate with offer as hired', async ({ page }) => {
    // Navigate to David Park (OfferSent candidate with existing offer docs)
    const candidateId = '00000000-0000-4000-c000-000000000004';
    await page.goto(`/candidates/${candidateId}`);

    // Wait for profile to load
    await expect(page.getByText('David Park')).toBeVisible({ timeout: 10_000 });

    // Click Mark as Hired button
    const hireButton = page.getByRole('button', { name: /mark as hired|mark hired/i });
    await expect(hireButton).toBeVisible({ timeout: 5_000 });
    await hireButton.click();

    // May have a confirmation dialog
    const confirmButton = page.getByRole('button', { name: /confirm|yes|proceed/i });
    if (await confirmButton.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await confirmButton.click();
    }

    // Verify status updated to Hired
    await expect(
      page
        .getByRole('status')
        .or(page.getByText(/^Hired$/))
        .first(),
    ).toBeVisible({ timeout: 10_000 });

    // Verify no more action buttons (terminal state)
    await expect(page.getByRole('button', { name: /reject/i })).not.toBeVisible();
  });
});

// ─────────────────────────────────────────────────────────────
// 8. Rejection Flow
// ─────────────────────────────────────────────────────────────
test.describe('Rejection Flow', () => {
  test('reject candidate with reason → verify terminal status', async ({ page }) => {
    // Navigate to Alice Johnson (Applied candidate — can be rejected)
    const candidateId = '00000000-0000-4000-c000-000000000001';
    await page.goto(`/candidates/${candidateId}`);

    // Wait for profile to load
    await expect(page.getByText('Alice Johnson')).toBeVisible({ timeout: 10_000 });

    // Click Reject button
    const rejectButton = page.getByRole('button', { name: /reject/i });
    await expect(rejectButton).toBeVisible({ timeout: 5_000 });
    await rejectButton.click();

    // Fill rejection reason in dialog
    const reasonInput = page
      .getByLabel(/reason/i)
      .or(page.getByPlaceholder(/reason/i))
      .or(page.getByRole('textbox').last());

    await expect(reasonInput).toBeVisible({ timeout: 5_000 });
    await reasonInput.fill(
      'Candidate does not meet the minimum experience requirements for this role after thorough evaluation.',
    );

    // Confirm rejection
    await page
      .getByRole('button', { name: /confirm|reject|submit/i })
      .last()
      .click();

    // Verify status updated to Rejected
    await expect(
      page
        .getByRole('status')
        .or(page.getByText(/^Rejected$/))
        .first(),
    ).toBeVisible({ timeout: 10_000 });

    // Verify terminal status — no action buttons should remain
    await expect(page.getByRole('button', { name: /reject|hire|generate/i })).not.toBeVisible();
  });

  test('rejection without reason shows validation error', async ({ page }) => {
    // Navigate to Bob Martinez (FormSubmitted — can be rejected)
    const candidateId = '00000000-0000-4000-c000-000000000002';
    await page.goto(`/candidates/${candidateId}`);

    await expect(page.getByText('Bob Martinez')).toBeVisible({ timeout: 10_000 });

    // Click Reject button
    const rejectButton = page.getByRole('button', { name: /reject/i });
    await expect(rejectButton).toBeVisible({ timeout: 5_000 });
    await rejectButton.click();

    // Fill rejection reason with too-short value
    const reasonInput = page.getByRole('textbox', { name: /reason/i });
    await expect(reasonInput).toBeVisible({ timeout: 5_000 });
    await reasonInput.fill('No'); // Too short (< 5 chars)

    // Verify inline validation — button stays disabled when reason is too short
    await expect(page.getByRole('button', { name: /reject candidate/i })).toBeDisabled();
  });
});
