/**
 * E2E port and DB are dedicated to Playwright (never the ones `bun dev` uses)
 * so a run can't collide with a developer's local server or clobber their data.
 *
 * Lives outside playwright.config.ts so e2e/setup.ts (loaded as `globalSetup`,
 * i.e. imported *by* the config while the config is loading) doesn't import
 * the config module itself.
 */
export const E2E_PORT = 3100;
export const E2E_BASE_URL = `http://localhost:${E2E_PORT}`;
export const E2E_DB_PATH = 'data/e2e-test.db';
