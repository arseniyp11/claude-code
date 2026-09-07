import { Database } from 'bun:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

/**
 * SQLite access layer (SPEC §6.1).
 *
 * This module creates every table, including better-auth's four.
 *
 * The intent was to let `bunx @better-auth/cli migrate` own the auth tables,
 * but the published CLI resolves its own bundled copy of @better-auth/core
 * rather than the version installed here, and that copy emits an `account`
 * table with no `issuer` column. Sign-up then fails at runtime with
 * "table account has no column named issuer".
 *
 * The DDL below matches what the installed better-auth (1.7.2) actually
 * expects — verified against `getAuthTables(auth.options)` — and mirrors
 * SPEC §5.1. Note the SQLite adapter stores dates as ISO strings and booleans
 * as 0/1 (`supportsDates: false`, `supportsBooleans: false`), which is why the
 * timestamp columns are TEXT and `emailVerified` is INTEGER.
 *
 * After upgrading better-auth, re-check this schema with:
 *   bun -e 'import{getAuthTables}from"@better-auth/core/db";
 *     import{auth}from"./lib/auth.ts";
 *     console.log(JSON.stringify(getAuthTables(auth.options),null,2))'
 */

// `||`, not `??`: an empty or whitespace-only DB_PATH (a blank line in
// .env.local) would otherwise resolve to the project root, and Bun would try to
// open a directory as the database.
const configuredPath = process.env.DB_PATH?.trim();
const DB_PATH = resolve(process.cwd(), configuredPath || 'data/app.db');

function createDb(): Database {
  let db: Database;

  try {
    // The data directory is not checked into the repo.
    mkdirSync(dirname(DB_PATH), { recursive: true });

    db = new Database(DB_PATH, { create: true, strict: true });
  } catch (error) {
    // Names the resolved path, which is what makes a misconfigured DB_PATH
    // diagnosable. This throws during server start-up, so it reaches the
    // operator's log and never a browser.
    throw new Error(
      `Could not open the database at ${DB_PATH}. Check DB_PATH and that the path is writable.`,
      { cause: error },
    );
  }

  db.run('PRAGMA journal_mode = WAL;');
  // Off by default in SQLite; without it the notes.user_id foreign key is inert.
  db.run('PRAGMA foreign_keys = ON;');
  // WAL still allows only one writer at a time; wait instead of throwing SQLITE_BUSY.
  db.run('PRAGMA busy_timeout = 5000;');

  migrate(db);

  return db;
}

function migrate(db: Database): void {
  db.transaction(() => {
    // --- better-auth core tables (SPEC §5.1) ---
    db.run(`
      CREATE TABLE IF NOT EXISTS user (
        id TEXT NOT NULL PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        emailVerified INTEGER NOT NULL DEFAULT 0,
        image TEXT,
        createdAt TEXT NOT NULL DEFAULT (datetime('now')),
        updatedAt TEXT NOT NULL DEFAULT (datetime('now'))
      );
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS session (
        id TEXT NOT NULL PRIMARY KEY,
        expiresAt TEXT NOT NULL,
        token TEXT NOT NULL UNIQUE,
        createdAt TEXT NOT NULL DEFAULT (datetime('now')),
        updatedAt TEXT NOT NULL DEFAULT (datetime('now')),
        ipAddress TEXT,
        userAgent TEXT,
        userId TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE
      );
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS account (
        id TEXT NOT NULL PRIMARY KEY,
        issuer TEXT NOT NULL,
        accountId TEXT NOT NULL,
        providerId TEXT NOT NULL,
        userId TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
        accessToken TEXT,
        refreshToken TEXT,
        idToken TEXT,
        accessTokenExpiresAt TEXT,
        refreshTokenExpiresAt TEXT,
        scope TEXT,
        password TEXT,
        createdAt TEXT NOT NULL DEFAULT (datetime('now')),
        updatedAt TEXT NOT NULL DEFAULT (datetime('now'))
      );
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS verification (
        id TEXT NOT NULL PRIMARY KEY,
        identifier TEXT NOT NULL,
        value TEXT NOT NULL,
        expiresAt TEXT NOT NULL,
        createdAt TEXT NOT NULL DEFAULT (datetime('now')),
        updatedAt TEXT NOT NULL DEFAULT (datetime('now'))
      );
    `);

    db.run('CREATE INDEX IF NOT EXISTS session_userId_idx ON session(userId);');
    db.run('CREATE INDEX IF NOT EXISTS account_userId_idx ON account(userId);');
    db.run(
      'CREATE UNIQUE INDEX IF NOT EXISTS idx_account_issuer_account_id ON account(issuer, accountId);',
    );
    db.run('CREATE INDEX IF NOT EXISTS verification_identifier_idx ON verification(identifier);');

    // --- application tables (SPEC §5.1, §5.2) ---
    db.run(`
      CREATE TABLE IF NOT EXISTS notes (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        title TEXT NOT NULL,
        content_json TEXT NOT NULL,
        is_public INTEGER NOT NULL DEFAULT 0,
        public_slug TEXT UNIQUE,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (user_id) REFERENCES user(id)
      );
    `);

    db.run('CREATE INDEX IF NOT EXISTS idx_notes_user_id ON notes(user_id);');
    db.run('CREATE INDEX IF NOT EXISTS idx_notes_public_slug ON notes(public_slug);');
    db.run('CREATE INDEX IF NOT EXISTS idx_notes_is_public ON notes(is_public);');
  })();
}

// Next.js re-evaluates modules on hot reload; without this the dev server would
// leak a new connection (and re-run the pragmas) on every edit.
const globalForDb = globalThis as typeof globalThis & {
  __appDb?: Database;
};

export const db: Database = globalForDb.__appDb ?? createDb();

if (process.env.NODE_ENV !== 'production') {
  globalForDb.__appDb = db;
}

/** Returns the singleton database connection. */
export function getDb(): Database {
  return db;
}

/** Runs a query and returns all matching rows. */
export function query<T>(sql: string, params: unknown[] = []): T[] {
  return db.query(sql).all(...(params as never[])) as T[];
}

/** Runs a query and returns the first row, or undefined when there is none. */
export function get<T>(sql: string, params: unknown[] = []): T | undefined {
  return (db.query(sql).get(...(params as never[])) as T | null) ?? undefined;
}

/** Executes a statement that returns no rows (INSERT/UPDATE/DELETE). */
export function run(sql: string, params: unknown[] = []) {
  return db.run(sql, ...(params as never[]));
}
