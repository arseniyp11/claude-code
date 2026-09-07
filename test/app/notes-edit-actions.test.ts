import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { EMPTY_DOC } from '@/lib/tiptap';

const { getCurrentUserMock, updateNoteMock, redirectMock, revalidatePathMock } = vi.hoisted(() => ({
  getCurrentUserMock: vi.fn(),
  updateNoteMock: vi.fn(),
  redirectMock: vi.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`);
  }),
  revalidatePathMock: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({ getCurrentUser: getCurrentUserMock }));
vi.mock('@/lib/notes', () => ({ updateNote: updateNoteMock }));
vi.mock('next/navigation', () => ({ redirect: redirectMock }));
vi.mock('next/cache', () => ({ revalidatePath: revalidatePathMock }));

const { updateNoteAction } = await import('@/app/notes/[id]/edit/actions');

const validContent = JSON.stringify(EMPTY_DOC);
const user = { id: 'user-1' };

function formData(entries: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [key, value] of Object.entries(entries)) fd.set(key, value);
  return fd;
}

beforeEach(() => {
  getCurrentUserMock.mockReset().mockResolvedValue(user);
  updateNoteMock.mockReset();
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('updateNoteAction', () => {
  it('redirects to sign-in, scoped to the note being edited, when signed out', async () => {
    getCurrentUserMock.mockResolvedValue(null);

    await expect(
      updateNoteAction({}, formData({ id: 'note-1', title: 't', contentJson: validContent })),
    ).rejects.toThrow('REDIRECT:/authenticate?next=%2Fnotes%2Fnote-1%2Fedit');
    expect(updateNoteMock).not.toHaveBeenCalled();
  });

  it('returns field errors without touching the store', async () => {
    const result = await updateNoteAction(
      {},
      formData({ id: 'note-1', title: 't', contentJson: 'not json' }),
    );

    expect(result.fieldErrors?.content).toBeTruthy();
    expect(updateNoteMock).not.toHaveBeenCalled();
  });

  it('reports "no longer exists" when the note is missing or not owned by the user', async () => {
    updateNoteMock.mockResolvedValue(null);

    const result = await updateNoteAction(
      {},
      formData({ id: 'note-1', title: 'New title', contentJson: validContent }),
    );

    expect(result.error).toBe('That note no longer exists.');
  });

  it('saves and revalidates the dashboard, note and edit pages', async () => {
    updateNoteMock.mockResolvedValue({ id: 'note-1', title: 'New title', publicSlug: null });

    const result = await updateNoteAction(
      {},
      formData({ id: 'note-1', title: 'New title', contentJson: validContent }),
    );

    expect(result).toEqual({ saved: true, title: 'New title' });
    expect(updateNoteMock).toHaveBeenCalledWith(user.id, 'note-1', {
      title: 'New title',
      contentJson: validContent,
    });
    expect(revalidatePathMock).toHaveBeenCalledWith('/dashboard');
    expect(revalidatePathMock).toHaveBeenCalledWith('/notes/note-1');
    expect(revalidatePathMock).toHaveBeenCalledWith('/notes/note-1/edit');
  });

  it('also revalidates the public page for a shared note', async () => {
    updateNoteMock.mockResolvedValue({ id: 'note-1', title: 'New title', publicSlug: 'abc123' });

    await updateNoteAction(
      {},
      formData({ id: 'note-1', title: 'New title', contentJson: validContent }),
    );

    expect(revalidatePathMock).toHaveBeenCalledWith('/p/abc123');
  });

  it('does not touch /p/[slug] for a private note', async () => {
    updateNoteMock.mockResolvedValue({ id: 'note-1', title: 'New title', publicSlug: null });

    await updateNoteAction(
      {},
      formData({ id: 'note-1', title: 'New title', contentJson: validContent }),
    );

    expect(revalidatePathMock).not.toHaveBeenCalledWith(expect.stringMatching(/^\/p\//));
  });

  it('returns a generic, reference-bearing error on failure', async () => {
    updateNoteMock.mockRejectedValue(new Error('internal db detail'));

    const result = await updateNoteAction(
      {},
      formData({ id: 'note-1', title: 'New title', contentJson: validContent }),
    );

    expect(result.error).toMatch(
      /^Could not save the note\. Please try again\. \(reference: [0-9a-f]{8}\)$/,
    );
  });
});
