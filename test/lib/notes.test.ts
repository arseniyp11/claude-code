import { randomUUID } from 'node:crypto';

import { beforeEach, describe, expect, it } from 'vitest';

import { getDb } from '@/lib/db';
import {
  createNote,
  DEFAULT_TITLE,
  deleteNote,
  getNoteByPublicSlug,
  getNoteById,
  getNotesByUser,
  setNotePublic,
  updateNote,
} from '@/lib/notes';
import { EMPTY_DOC } from '@/lib/tiptap';

/**
 * `notes.user_id` is a real foreign key (PRAGMA foreign_keys = ON in lib/db.ts),
 * so every test needs an actual row in `user` to attach notes to.
 */
function createUser(): string {
  const id = randomUUID();
  getDb().run('INSERT INTO user (id, name, email) VALUES (?, ?, ?)', [
    id,
    'Test User',
    `${id}@example.com`,
  ]);
  return id;
}

let userId: string;
let otherUserId: string;

beforeEach(() => {
  userId = createUser();
  otherUserId = createUser();
});

describe('createNote', () => {
  it('creates a note with defaults when no data is given', async () => {
    const note = await createNote(userId, {});

    expect(note.userId).toBe(userId);
    expect(note.title).toBe(DEFAULT_TITLE);
    expect(JSON.parse(note.contentJson)).toEqual(EMPTY_DOC);
    expect(note.isPublic).toBe(false);
    expect(note.publicSlug).toBeNull();
    expect(note.id).toBeTruthy();
  });

  it('creates a note with the given title and content', async () => {
    const content = JSON.stringify({ type: 'doc', content: [{ type: 'paragraph' }] });
    const note = await createNote(userId, { title: 'Hello', contentJson: content });

    expect(note.title).toBe('Hello');
    expect(note.contentJson).toBe(content);
  });
});

describe('getNoteById', () => {
  it('returns the note when owned by the given user', async () => {
    const created = await createNote(userId, { title: 'Mine' });
    const fetched = await getNoteById(userId, created.id);

    expect(fetched).toEqual(created);
  });

  it('returns null when the note belongs to another user', async () => {
    const created = await createNote(userId, { title: 'Mine' });
    const fetched = await getNoteById(otherUserId, created.id);

    expect(fetched).toBeNull();
  });

  it('returns null for a nonexistent note id', async () => {
    expect(await getNoteById(userId, randomUUID())).toBeNull();
  });
});

describe('getNotesByUser', () => {
  it("returns only the given user's notes, newest updated first", async () => {
    const a = await createNote(userId, { title: 'A' });
    // Ensure a distinct updated_at ordering independent of wall-clock ties.
    await updateNote(userId, a.id, { title: 'A updated' });
    await createNote(userId, { title: 'B' });
    await createNote(otherUserId, { title: 'Not mine' });

    const notes = await getNotesByUser(userId);

    expect(notes).toHaveLength(2);
    expect(notes.map((n) => n.title).sort()).toEqual(['A updated', 'B'].sort());
    expect(notes.every((n) => n.userId === userId)).toBe(true);
  });

  it('returns an empty array for a user with no notes', async () => {
    expect(await getNotesByUser(userId)).toEqual([]);
  });
});

describe('updateNote', () => {
  it('updates only the given fields', async () => {
    const content = JSON.stringify({ type: 'doc', content: [{ type: 'paragraph' }] });
    const created = await createNote(userId, { title: 'Original', contentJson: content });

    const updated = await updateNote(userId, created.id, { title: 'Renamed' });

    expect(updated?.title).toBe('Renamed');
    expect(updated?.contentJson).toBe(content);
  });

  it('advances updated_at', async () => {
    const created = await createNote(userId, { title: 'Original' });
    const updated = await updateNote(userId, created.id, { title: 'Renamed' });

    expect(updated?.updatedAt).toBeTruthy();
    // The row must actually have moved, not merely be re-readable.
    expect(new Date(`${updated!.updatedAt.replace(' ', 'T')}Z`).getTime()).toBeGreaterThanOrEqual(
      new Date(`${created.updatedAt.replace(' ', 'T')}Z`).getTime(),
    );
  });

  it('returns the unchanged note when called with no fields', async () => {
    const created = await createNote(userId, { title: 'Original' });
    const result = await updateNote(userId, created.id, {});

    expect(result).toEqual(created);
  });

  it("returns null and changes nothing for another user's note", async () => {
    const created = await createNote(userId, { title: 'Original' });
    const result = await updateNote(otherUserId, created.id, { title: 'Hijacked' });

    expect(result).toBeNull();
    expect((await getNoteById(userId, created.id))?.title).toBe('Original');
  });

  it('returns null for a nonexistent note', async () => {
    expect(await updateNote(userId, randomUUID(), { title: 'x' })).toBeNull();
  });
});

describe('deleteNote', () => {
  it('deletes a note owned by the user', async () => {
    const created = await createNote(userId, {});
    await deleteNote(userId, created.id);

    expect(await getNoteById(userId, created.id)).toBeNull();
  });

  it("does not delete another user's note", async () => {
    const created = await createNote(userId, {});
    await deleteNote(otherUserId, created.id);

    expect(await getNoteById(userId, created.id)).not.toBeNull();
  });

  it('is a no-op for a nonexistent note', async () => {
    await expect(deleteNote(userId, randomUUID())).resolves.toBeUndefined();
  });
});

describe('setNotePublic', () => {
  it('assigns a public slug when enabled', async () => {
    const created = await createNote(userId, {});
    const shared = await setNotePublic(userId, created.id, true);

    expect(shared?.isPublic).toBe(true);
    expect(shared?.publicSlug).toBeTruthy();
  });

  it('keeps the same slug across repeated enables', async () => {
    const created = await createNote(userId, {});
    const first = await setNotePublic(userId, created.id, true);
    const second = await setNotePublic(userId, created.id, true);

    expect(second?.publicSlug).toBe(first?.publicSlug);
  });

  it('clears the slug when disabled, permanently', async () => {
    const created = await createNote(userId, {});
    const shared = await setNotePublic(userId, created.id, true);
    const unshared = await setNotePublic(userId, created.id, false);

    expect(unshared?.isPublic).toBe(false);
    expect(unshared?.publicSlug).toBeNull();

    // Re-enabling issues a *different* slug — the old link must not come back.
    const resharedSlug = (await setNotePublic(userId, created.id, true))?.publicSlug;
    expect(resharedSlug).not.toBe(shared?.publicSlug);
  });

  it("does not affect another user's note", async () => {
    const created = await createNote(userId, {});
    const result = await setNotePublic(otherUserId, created.id, true);

    expect(result).toBeNull();
    expect((await getNoteById(userId, created.id))?.isPublic).toBe(false);
  });
});

describe('getNoteByPublicSlug', () => {
  it('finds a public note by slug, unscoped by user', async () => {
    const created = await createNote(userId, { title: 'Shared' });
    const shared = await setNotePublic(userId, created.id, true);

    const found = await getNoteByPublicSlug(shared!.publicSlug!);

    expect(found?.id).toBe(created.id);
  });

  it('returns null once sharing is disabled, even with the old slug', async () => {
    const created = await createNote(userId, {});
    const shared = await setNotePublic(userId, created.id, true);
    await setNotePublic(userId, created.id, false);

    expect(await getNoteByPublicSlug(shared!.publicSlug!)).toBeNull();
  });

  it('returns null for an unknown slug', async () => {
    expect(await getNoteByPublicSlug('does-not-exist')).toBeNull();
  });
});
