// The note repository closes over the SQLite handle; a client-component import
// of this module should fail the build, not ship the query layer to a browser.
import 'server-only';

import { nanoid } from 'nanoid';

import { get, query, run } from './db';
import { EMPTY_DOC } from './tiptap';

/**
 * Note repository (SPEC §6.2).
 *
 * Every function except `getNoteByPublicSlug` takes `userId` and pins it in the
 * WHERE clause. Ownership is therefore enforced in SQL: a caller that forgets an
 * API-layer permission check still cannot read or write another user's row, and
 * "not yours" and "does not exist" are indistinguishable to it — both surface as
 * `null`, which is what lets the routes answer 404 rather than 403 (SPEC §11).
 */

export type Note = {
  id: string;
  userId: string;
  title: string;
  /** Stringified TipTap document. Parsed at the edges, never stored parsed. */
  contentJson: string;
  isPublic: boolean;
  publicSlug: string | null;
  createdAt: string;
  updatedAt: string;
};

/** The `notes` table is snake_case and stores booleans as INTEGER 0/1. */
type NoteRow = {
  id: string;
  user_id: string;
  title: string;
  content_json: string;
  is_public: number;
  public_slug: string | null;
  created_at: string;
  updated_at: string;
};

const COLUMNS = 'id, user_id, title, content_json, is_public, public_slug, created_at, updated_at';

export const DEFAULT_TITLE = 'Untitled note';

function toNote(row: NoteRow): Note {
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    contentJson: row.content_json,
    isPublic: row.is_public === 1,
    publicSlug: row.public_slug,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * These wrappers are async because SPEC §6.2 types them that way and because
 * callers shouldn't have to change if the store ever stops being synchronous.
 * `bun:sqlite` itself is synchronous, so nothing here actually awaits.
 */

export async function createNote(
  userId: string,
  data: { title?: string; contentJson?: string },
): Promise<Note> {
  const row = get<NoteRow>(
    `INSERT INTO notes (id, user_id, title, content_json)
     VALUES (?, ?, ?, ?)
     RETURNING ${COLUMNS}`,
    [
      crypto.randomUUID(),
      userId,
      data.title ?? DEFAULT_TITLE,
      data.contentJson ?? JSON.stringify(EMPTY_DOC),
    ],
  );

  // RETURNING on a successful INSERT always yields the row; a miss means the
  // statement failed in a way SQLite didn't raise, which we'd rather not mask.
  if (!row) throw new Error('Failed to create note');

  return toNote(row);
}

export async function getNoteById(userId: string, noteId: string): Promise<Note | null> {
  const row = get<NoteRow>(`SELECT ${COLUMNS} FROM notes WHERE id = ? AND user_id = ?`, [
    noteId,
    userId,
  ]);

  return row ? toNote(row) : null;
}

export async function getNotesByUser(userId: string): Promise<Note[]> {
  const rows = query<NoteRow>(
    `SELECT ${COLUMNS} FROM notes WHERE user_id = ? ORDER BY updated_at DESC`,
    [userId],
  );

  return rows.map(toNote);
}

export async function updateNote(
  userId: string,
  noteId: string,
  data: Partial<{ title: string; contentJson: string }>,
): Promise<Note | null> {
  // Build the SET list from the keys actually present, so an update of one
  // field can't blank the other by passing undefined through to SQLite.
  const assignments: string[] = [];
  const params: unknown[] = [];

  if (data.title !== undefined) {
    assignments.push('title = ?');
    params.push(data.title);
  }

  if (data.contentJson !== undefined) {
    assignments.push('content_json = ?');
    params.push(data.contentJson);
  }

  if (assignments.length === 0) return getNoteById(userId, noteId);

  assignments.push("updated_at = datetime('now')");

  const row = get<NoteRow>(
    `UPDATE notes SET ${assignments.join(', ')}
     WHERE id = ? AND user_id = ?
     RETURNING ${COLUMNS}`,
    [...params, noteId, userId],
  );

  return row ? toNote(row) : null;
}

export async function deleteNote(userId: string, noteId: string): Promise<void> {
  run('DELETE FROM notes WHERE id = ? AND user_id = ?', [noteId, userId]);
}

export async function setNotePublic(
  userId: string,
  noteId: string,
  isPublic: boolean,
): Promise<Note | null> {
  if (!isPublic) {
    const row = get<NoteRow>(
      `UPDATE notes SET is_public = 0, public_slug = NULL, updated_at = datetime('now')
       WHERE id = ? AND user_id = ?
       RETURNING ${COLUMNS}`,
      [noteId, userId],
    );

    return row ? toNote(row) : null;
  }

  // COALESCE keeps an already-issued slug stable, so re-enabling sharing does
  // not silently break links that were handed out earlier.
  const row = get<NoteRow>(
    `UPDATE notes
     SET is_public = 1,
         public_slug = COALESCE(public_slug, ?),
         updated_at = datetime('now')
     WHERE id = ? AND user_id = ?
     RETURNING ${COLUMNS}`,
    [nanoid(), noteId, userId],
  );

  return row ? toNote(row) : null;
}

/**
 * The one lookup not scoped by user — it backs the anonymous `/p/[slug]` page.
 * `is_public = 1` is part of the predicate rather than a check on the result, so
 * a note whose sharing was turned off is simply not found.
 */
export async function getNoteByPublicSlug(slug: string): Promise<Note | null> {
  const row = get<NoteRow>(`SELECT ${COLUMNS} FROM notes WHERE public_slug = ? AND is_public = 1`, [
    slug,
  ]);

  return row ? toNote(row) : null;
}
