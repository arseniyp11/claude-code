import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { EMPTY_DOC } from '@/lib/tiptap';

const { getCurrentUserMock, createNoteMock, setNotePublicMock, redirectMock, revalidatePathMock } =
  vi.hoisted(() => ({
    getCurrentUserMock: vi.fn(),
    createNoteMock: vi.fn(),
    setNotePublicMock: vi.fn(),
    redirectMock: vi.fn((url: string) => {
      throw new Error(`REDIRECT:${url}`);
    }),
    revalidatePathMock: vi.fn(),
  }));

vi.mock('@/lib/auth', () => ({ getCurrentUser: getCurrentUserMock }));
vi.mock('@/lib/notes', () => ({ createNote: createNoteMock, setNotePublic: setNotePublicMock }));
vi.mock('next/navigation', () => ({ redirect: redirectMock }));
vi.mock('next/cache', () => ({ revalidatePath: revalidatePathMock }));

const { createNoteAction } = await import('@/app/notes/new/actions');

const validContent = JSON.stringify(EMPTY_DOC);
const user = { id: 'user-1' };

function formData(entries: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [key, value] of Object.entries(entries)) fd.set(key, value);
  return fd;
}

beforeEach(() => {
  getCurrentUserMock.mockReset().mockResolvedValue(user);
  createNoteMock.mockReset();
  setNotePublicMock.mockReset();
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('createNoteAction', () => {
  it('redirects to sign-in when signed out', async () => {
    getCurrentUserMock.mockResolvedValue(null);

    await expect(
      createNoteAction({}, formData({ title: 't', contentJson: validContent })),
    ).rejects.toThrow('REDIRECT:/authenticate?next=%2Fnotes%2Fnew');
    expect(createNoteMock).not.toHaveBeenCalled();
  });

  it('returns field errors for invalid content instead of creating a note', async () => {
    const result = await createNoteAction(
      {},
      formData({ title: 't', contentJson: '{"type":"paragraph"}' }),
    );

    expect(result.fieldErrors?.content).toBeTruthy();
    expect(result.title).toBe('t');
    expect(createNoteMock).not.toHaveBeenCalled();
  });

  it('creates the note, revalidates the dashboard and redirects to it', async () => {
    createNoteMock.mockResolvedValue({ id: 'note-1' });

    await expect(
      createNoteAction({}, formData({ title: 'My note', contentJson: validContent })),
    ).rejects.toThrow('REDIRECT:/notes/note-1');

    expect(createNoteMock).toHaveBeenCalledWith(user.id, {
      title: 'My note',
      contentJson: validContent,
    });
    expect(revalidatePathMock).toHaveBeenCalledWith('/dashboard');
    expect(setNotePublicMock).not.toHaveBeenCalled();
  });

  it('shares the note when sharePublicly is checked', async () => {
    createNoteMock.mockResolvedValue({ id: 'note-1' });
    setNotePublicMock.mockResolvedValue({ id: 'note-1', isPublic: true });

    await expect(
      createNoteAction(
        {},
        formData({ title: 'My note', contentJson: validContent, sharePublicly: 'on' }),
      ),
    ).rejects.toThrow('REDIRECT:/notes/note-1');

    expect(setNotePublicMock).toHaveBeenCalledWith(user.id, 'note-1', true);
  });

  it('still redirects to the note when sharing fails after creation', async () => {
    createNoteMock.mockResolvedValue({ id: 'note-1' });
    setNotePublicMock.mockRejectedValue(new Error('db exploded'));

    // Losing the note is worse than losing the share toggle — creation success
    // must not be undone by a sharing failure.
    await expect(
      createNoteAction(
        {},
        formData({ title: 'My note', contentJson: validContent, sharePublicly: 'on' }),
      ),
    ).rejects.toThrow('REDIRECT:/notes/note-1');
  });

  it('returns a generic, reference-bearing error when note creation fails', async () => {
    createNoteMock.mockRejectedValue(new Error('constraint violation: leaks schema'));

    const result = await createNoteAction({}, formData({ title: 't', contentJson: validContent }));

    expect(result.error).toMatch(
      /^Could not save the note\. Please try again\. \(reference: [0-9a-f]{8}\)$/,
    );
    expect(result.error).not.toContain('constraint violation');
  });
});
