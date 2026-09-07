import { defineConfig, devices } from '@playwright/test';

import { E2E_BASE_URL, E2E_DB_PATH, E2E_PORT } from './e2e/constants';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'list',

  use: {
    baseURL: E2E_BASE_URL,
    trace: 'on-first-retry',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  // Boots a dedicated server on E2E_PORT against E2E_DB_PATH, isolated from
  // whatever `bun dev` has running on the developer's own port/DB_PATH.
  webServer: {
    command: `bun run e2e/setup.ts && E2E=1 DB_PATH=${E2E_DB_PATH} BETTER_AUTH_URL=${E2E_BASE_URL} bun run --bun next dev -p ${E2E_PORT}`,
    url: E2E_BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
    stdout: 'pipe',
    stderr: 'pipe',
  },
});
