import { expect, test } from '@playwright/test';

import { randomCredentials, signUp } from './helpers/auth';

/**
 * Minimal wiring check for the Playwright setup itself: the dev server comes
 * up, the DB is reachable, and the auth helper can drive a real sign-up.
 * Feature coverage (auth edge cases, notes CRUD, sharing) belongs in their own
 * dedicated spec files, not here.
 */
test('landing page loads', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/.+/);
});

test('a new user can sign up and lands on the dashboard', async ({ page }) => {
  await signUp(page, randomCredentials());
  await expect(page).toHaveURL('/dashboard');
});
