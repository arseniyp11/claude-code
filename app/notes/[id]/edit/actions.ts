'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';

import { getCurrentUser } from '@/lib/auth';
import { reportError, withReference } from '@/lib/errors';
import { noteInputSchema } from '@/lib/note-input';
import { updateNote } from '@/lib/notes';
import { authenticateUrl } from '@/lib/redirects';

export type EditNoteFormState = {
  /** Form-level message, shown above the fields. */
  error?: string;
  fieldErrors?: {
    title?: string;
    content?: string;
  };
  /** Echoed back so the field survives a failed submit. */
  title?: string;
  /** Drives the "saved" confirmation. */
  saved?: boolean;
};

export async function updateNoteAction(
  _prevState: EditNoteFormState,
  formData: FormData,
): Promise<EditNoteFormState> {
  const id = String(formData.get('id') ?? '');
  const title = String(formData.get('title') ?? '');

  // A page guard doesn't cover the actions that page renders — an action is a
  // separately addressable POST endpoint, so it re-checks the session itself.
  const user = await getCurrentUser();
  // `id` is form-supplied, so it is encoded rather than interpolated raw.
  if (!user) redirect(authenticateUrl(`/notes/${id}/edit`));

  const parsed = noteInputSchema.safeParse({
    title,
    contentJson: formData.get('contentJson'),
  });

  if (!parsed.success) {
    const { fieldErrors } = z.flattenError(parsed.error);
    return {
      fieldErrors: {
        title: fieldErrors.title?.[0],
        content: fieldErrors.contentJson?.[0],
      },
      title,
    };
  }

  // Declared out here because the revalidation below needs the note's slug.
  let note: Awaited<ReturnType<typeof updateNote>>;

  try {
    // Scoped by user_id in SQL, so someone else's note id updates nothing and
    // comes back null — the id in the form is never trusted on its own.
    note = await updateNote(user.id, id, parsed.data);

    if (!note) {
      return { error: 'That note no longer exists.', title };
    }
  } catch (error) {
    // The real failure goes to the log; the visitor gets a reference id and
    // nothing about the database.
    const reference = reportError('Failed to update note', error);
    return {
      error: withReference('Could not save the note. Please try again.', reference),
      title,
    };
  }

  revalidatePath('/dashboard');
  revalidatePath(`/notes/${id}`);
  revalidatePath(`/notes/${id}/edit`);

  // A shared note has a second, cacheable address; without this the public page
  // would keep serving the pre-edit version to everyone holding the link.
  if (note.publicSlug) revalidatePath(`/p/${note.publicSlug}`);

  return { saved: true, title: parsed.data.title };
}
