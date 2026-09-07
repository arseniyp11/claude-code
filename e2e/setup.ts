import { existsSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';

import { E2E_DB_PATH } from './constants';

/**
 * Test-database setup, run once before the suite starts.
 *
 * Invoked as a plain script from `webServer.command` in playwright.config.ts
 * (not wired up as Playwright's `globalSetup` option) because Bun's bundler
 * eagerly resolves playwright-core's optional lazy `require()` calls (its
 * BiDi-protocol support) when Playwright loads a TS `globalSetup` file, which
 * fails outside a full Playwright install — see
 * https://github.com/oven-sh/bun/issues (chromium-bidi resolution error).
 * Running it as an ordinary script sidesteps that path entirely.
 *
 * The dev server this precedes creates `E2E_DB_PATH` on first connection
 * (lib/db.ts's `CREATE TABLE IF NOT EXISTS` migration), so all this needs to
 * do is remove any leftovers from a previous run — otherwise a signed-up user
 * or note from a prior run would leak into this one.
 */
function main(): void {
  const base = resolve(process.cwd(), E2E_DB_PATH);

  for (const suffix of ['', '-wal', '-shm']) {
    const path = `${base}${suffix}`;
    if (existsSync(path)) rmSync(path);
  }
}

main();
