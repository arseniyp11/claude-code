import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const {
  getCurrentUserMock,
  getNoteByIdMock,
  deleteNoteMock,
  setNotePublicMock,
  redirectMock,
  revalidatePathMock,
} = vi.hoisted(() => ({
  getCurrentUserMock: vi.fn(),
  getNoteByIdMock: vi.fn(),
  deleteNoteMock: vi.fn(),
  setNotePublicMock: vi.fn(),
  redirectMock: vi.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`);
  }),
  revalidatePathMock: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({ getCurrentUser: getCurrentUserMock }));
vi.mock('@/lib/notes', () => ({
  getNoteById: getNoteByIdMock,
  deleteNote: deleteNoteMock,
  setNotePublic: setNotePublicMock,
}));
vi.mock('next/navigation', () => ({ redirect: redirectMock }));
vi.mock('next/cache', () => ({ revalidatePath: revalidatePathMock }));

const { deleteNoteAction, setNoteSharingAction } = await import('@/app/notes/[id]/actions');

const user = { id: 'user-1' };

function formData(entries: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [key, value] of Object.entries(entries)) fd.set(key, value);
  return fd;
}

beforeEach(() => {
  getCurrentUserMock.mockReset().mockResolvedValue(user);
  getNoteByIdMock.mockReset();
  deleteNoteMock.mockReset();
  setNotePublicMock.mockReset();
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('deleteNoteAction', () => {
  it('redirects to sign-in, scoped to the note, when signed out', async () => {
    getCurrentUserMock.mockResolvedValue(null);

    await expect(deleteNoteAction({}, formData({ id: 'note-1' }))).rejects.toThrow(
      'REDIRECT:/authenticate?next=%2Fnotes%2Fnote-1',
    );
    expect(deleteNoteMock).not.toHaveBeenCalled();
  });

  it('reports "no longer exists" without deleting when the note is not found or not owned', async () => {
    getNoteByIdMock.mockResolvedValue(null);

    const result = await deleteNoteAction({}, formData({ id: 'note-1' }));

    expect(result.error).toBe('That note no longer exists.');
    expect(deleteNoteMock).not.toHaveBeenCalled();
  });

  it('deletes the note, revalidates, and redirects to the dashboard', async () => {
    getNoteByIdMock.mockResolvedValue({ id: 'note-1', publicSlug: null });

    await expect(deleteNoteAction({}, formData({ id: 'note-1' }))).rejects.toThrow(
      'REDIRECT:/dashboard',
    );

    expect(deleteNoteMock).toHaveBeenCalledWith(user.id, 'note-1');
    expect(revalidatePathMock).toHaveBeenCalledWith('/dashboard');
    expect(revalidatePathMock).toHaveBeenCalledWith('/notes/note-1');
    expect(revalidatePathMock).toHaveBeenCalledWith('/notes/note-1/edit');
  });

  it('revalidates the public page of a note that was shared', async () => {
    getNoteByIdMock.mockResolvedValue({ id: 'note-1', publicSlug: 'abc123' });

    await expect(deleteNoteAction({}, formData({ id: 'note-1' }))).rejects.toThrow(
      'REDIRECT:/dashboard',
    );

    expect(revalidatePathMock).toHaveBeenCalledWith('/p/abc123');
  });

  it('returns a generic, reference-bearing error on failure', async () => {
    getNoteByIdMock.mockResolvedValue({ id: 'note-1', publicSlug: null });
    deleteNoteMock.mockRejectedValue(new Error('internal db detail'));

    const result = await deleteNoteAction({}, formData({ id: 'note-1' }));

    expect(result.error).toMatch(
      /^Could not delete the note\. Please try again\. \(reference: [0-9a-f]{8}\)$/,
    );
  });
});

describe('setNoteSharingAction', () => {
  it('redirects to sign-in, scoped to the note, when signed out', async () => {
    getCurrentUserMock.mockResolvedValue(null);

    await expect(
      setNoteSharingAction({}, formData({ id: 'note-1', isPublic: 'true' })),
    ).rejects.toThrow('REDIRECT:/authenticate?next=%2Fnotes%2Fnote-1');
  });

  it('reports "no longer exists" when the note is not found before the write', async () => {
    getNoteByIdMock.mockResolvedValue(null);

    const result = await setNoteSharingAction({}, formData({ id: 'note-1', isPublic: 'true' }));

    expect(result.error).toBe('That note no longer exists.');
    expect(setNotePublicMock).not.toHaveBeenCalled();
  });

  it('reports "no longer exists" when the write itself finds nothing (race)', async () => {
    getNoteByIdMock.mockResolvedValue({ id: 'note-1', publicSlug: null });
    setNotePublicMock.mockResolvedValue(null);

    const result = await setNoteSharingAction({}, formData({ id: 'note-1', isPublic: 'true' }));

    expect(result.error).toBe('That note no longer exists.');
  });

  it('treats any value other than the literal string "true" as turning sharing off', async () => {
    getNoteByIdMock.mockResolvedValue({ id: 'note-1', publicSlug: 'abc123' });
    setNotePublicMock.mockResolvedValue({ id: 'note-1', publicSlug: null });

    await setNoteSharingAction({}, formData({ id: 'note-1', isPublic: 'garbled' }));

    expect(setNotePublicMock).toHaveBeenCalledWith(user.id, 'note-1', false);
  });

  it('revalidates the dashboard, note pages, and both the old and new public slugs', async () => {
    getNoteByIdMock.mockResolvedValue({ id: 'note-1', publicSlug: 'old-slug' });
    setNotePublicMock.mockResolvedValue({ id: 'note-1', publicSlug: 'new-slug' });

    const result = await setNoteSharingAction({}, formData({ id: 'note-1', isPublic: 'true' }));

    expect(result).toEqual({});
    expect(revalidatePathMock).toHaveBeenCalledWith('/dashboard');
    expect(revalidatePathMock).toHaveBeenCalledWith('/notes/note-1');
    expect(revalidatePathMock).toHaveBeenCalledWith('/notes/note-1/edit');
    expect(revalidatePathMock).toHaveBeenCalledWith('/p/old-slug');
    expect(revalidatePathMock).toHaveBeenCalledWith('/p/new-slug');
  });

  it('does not revalidate a slug twice when it did not change', async () => {
    getNoteByIdMock.mockResolvedValue({ id: 'note-1', publicSlug: 'same-slug' });
    setNotePublicMock.mockResolvedValue({ id: 'note-1', publicSlug: 'same-slug' });

    await setNoteSharingAction({}, formData({ id: 'note-1', isPublic: 'true' }));

    const slugCalls = revalidatePathMock.mock.calls.filter((call) => call[0] === '/p/same-slug');
    expect(slugCalls).toHaveLength(1);
  });

  it('returns a generic, reference-bearing error on failure', async () => {
    getNoteByIdMock.mockResolvedValue({ id: 'note-1', publicSlug: null });
    setNotePublicMock.mockRejectedValue(new Error('internal db detail'));

    const result = await setNoteSharingAction({}, formData({ id: 'note-1', isPublic: 'true' }));

    expect(result.error).toMatch(
      /^Could not change sharing for this note\. Please try again\. \(reference: [0-9a-f]{8}\)$/,
    );
  });
});
