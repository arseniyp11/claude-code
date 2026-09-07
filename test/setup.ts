import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterAll } from 'vitest';

/**
 * Every test file gets its own throwaway SQLite file.
 *
 * `lib/db.ts` opens `DB_PATH` (default `data/app.db`) as a side effect of being
 * imported, and several modules under test (`lib/notes`, `lib/note-input`,
 * `lib/auth`) import it transitively. Pointing `DB_PATH` here before any of them
 * load keeps tests from creating or touching the real dev database.
 */
const dir = mkdtempSync(join(tmpdir(), 'claude-code-test-'));
process.env.DB_PATH = join(dir, 'test.db');
process.env.BETTER_AUTH_SECRET = 'test-secret-test-secret';

afterAll(() => {
  rmSync(dir, { recursive: true, force: true });
});
