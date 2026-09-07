'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';

import { getCurrentUser } from '@/lib/auth';
import { reportError, withReference } from '@/lib/errors';
import { noteInputSchema } from '@/lib/note-input';
import { createNote, setNotePublic } from '@/lib/notes';
import { authenticateUrl } from '@/lib/redirects';

export type NewNoteFormState = {
  /** Form-level message, shown above the fields. */
  error?: string;
  fieldErrors?: {
    title?: string;
    content?: string;
  };
  /** Echoed back so the field survives a failed submit. */
  title?: string;
};

export async function createNoteAction(
  _prevState: NewNoteFormState,
  formData: FormData,
): Promise<NewNoteFormState> {
  const title = String(formData.get('title') ?? '');
  // An unchecked checkbox submits nothing at all, so absence means private.
  const sharePublicly = formData.get('sharePublicly') === 'on';

  // A page guard doesn't cover the actions that page renders — an action is a
  // separately addressable POST endpoint, so it re-checks the session itself.
  const user = await getCurrentUser();
  if (!user) redirect(authenticateUrl('/notes/new'));

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

  let noteId: string;

  try {
    const note = await createNote(user.id, parsed.data);
    noteId = note.id;
  } catch (error) {
    // The real failure goes to the log; the visitor gets a reference id and
    // nothing about the database.
    const reference = reportError('Failed to create note', error);
    return {
      error: withReference('Could not save the note. Please try again.', reference),
      title,
    };
  }

  // Sharing is a second statement, and it gets its own try: the note already
  // exists at this point, so a failure here must not cost the user their
  // writing. It is logged and swallowed — they land on the note with sharing
  // off and the toggle right there, which is recoverable; losing the note is
  // not. The slug needs no revalidation, since /p/[slug] has never been
  // rendered for a note that was created moments ago.
  if (sharePublicly) {
    try {
      await setNotePublic(user.id, noteId, true);
    } catch (error) {
      reportError('Failed to share newly created note', error);
    }
  }

  revalidatePath('/dashboard');

  // Outside the try: redirect() signals by throwing, so a catch would swallow it.
  redirect(`/notes/${noteId}`);
}
