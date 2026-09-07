import type { Page } from '@playwright/test';

export type Credentials = { email: string; password: string };

/** A fresh, valid-enough credential pair so tests never collide on email. */
export function randomCredentials(): Credentials {
  return {
    email: `e2e-${crypto.randomUUID()}@example.com`,
    password: 'correct-horse-battery-staple',
  };
}

/** Drives the real /authenticate UI (app/authenticate/auth-form.tsx) to sign up, landing on `next`. */
export async function signUp(page: Page, { email, password }: Credentials, next = '/dashboard') {
  await page.goto(`/authenticate?mode=signup&next=${encodeURIComponent(next)}`);
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Create account' }).click();
  await page.waitForURL(next);
}

/** Drives the real /authenticate UI to sign in an existing user, landing on `next`. */
export async function login(page: Page, { email, password }: Credentials, next = '/dashboard') {
  await page.goto(`/authenticate?next=${encodeURIComponent(next)}`);
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.waitForURL(next);
}
