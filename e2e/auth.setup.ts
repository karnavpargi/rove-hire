import { test as setup, expect } from '@playwright/test';
import path from 'path';

const authFile = path.join(__dirname, '.auth/user.json');

/**
 * Global setup: authenticate as the HR user and save storage state
 * so subsequent tests reuse the session cookie.
 */
setup('authenticate as HR user', async ({ page }) => {
  await page.goto('/login');

  // Fill in credentials from seed data
  await page.getByLabel(/email/i).fill('hr@rove.com');
  await page.getByLabel(/password/i).fill('RoveHire2024!');
  await page.getByRole('button', { name: /sign in|log in|login/i }).click();

  // Wait for redirect to dashboard
  await expect(page).toHaveURL(/\/(dashboard)?$/);

  // Save signed-in state
  await page.context().storageState({ path: authFile });
});
