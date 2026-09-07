'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { getCurrentUser } from '@/lib/auth';
import { reportError, withReference } from '@/lib/errors';
import { deleteNote, getNoteById, setNotePublic } from '@/lib/notes';
import { authenticateUrl } from '@/lib/redirects';

export type DeleteNoteFormState = {
  /** Shown inside the confirmation dialog; the dialog stays open on failure. */
  error?: string;
};

export async function deleteNoteAction(
  _prevState: DeleteNoteFormState,
  formData: FormData,
): Promise<DeleteNoteFormState> {
  const id = String(formData.get('id') ?? '');

  // A page guard doesn't cover the actions that page renders — an action is a
  // separately addressable POST endpoint, so it re-checks the session itself.
  const user = await getCurrentUser();
  // `id` is form-supplied, so it is encoded rather than interpolated raw.
  if (!user) redirect(authenticateUrl(`/notes/${id}`));

  // Declared out here because the revalidation below needs the note's slug,
  // which stops existing the moment the row does.
  let publicSlug: string | null = null;

  try {
    // `deleteNote` returns void, so it can't say whether a row matched. Reading
    // first — scoped by user_id, so someone else's note id simply isn't found —
    // is what lets this report "no longer exists" instead of a silent success,
    // and it is also the only chance to learn the public slug.
    const note = await getNoteById(user.id, id);

    if (!note) {
      return { error: 'That note no longer exists.' };
    }

    publicSlug = note.publicSlug;

    // Scoped by user_id in SQL as well: the id in the form is never trusted on
    // its own, even though the read above already established ownership.
    await deleteNote(user.id, id);
  } catch (error) {
    // The real failure goes to the log; the visitor gets a reference id and
    // nothing about the database.
    const reference = reportError('Failed to delete note', error);
    return {
      error: withReference('Could not delete the note. Please try again.', reference),
    };
  }

  revalidatePath('/dashboard');
  revalidatePath(`/notes/${id}`);
  revalidatePath(`/notes/${id}/edit`);

  // A shared note has a second, cacheable address; without this the public page
  // would keep serving a deleted note to everyone holding the link.
  if (publicSlug) revalidatePath(`/p/${publicSlug}`);

  // Outside the try: redirect() signals by throwing, so a catch would swallow
  // it. It also has to come after the revalidations — nothing after it runs.
  redirect('/dashboard');
}

export type ShareNoteFormState = {
  /** Shown beside the toggle; the panel stays put on failure. */
  error?: string;
};

/**
 * Turns public sharing on or off for one note (SPEC §3.3).
 *
 * Unlike delete this does not redirect: the user toggled a control on a page
 * they are still reading, and the revalidation below is what refreshes the
 * link. Enabling mints a slug, disabling drops it — permanently, so a link that
 * was handed out cannot be revived by toggling sharing back on.
 */
export async function setNoteSharingAction(
  _prevState: ShareNoteFormState,
  formData: FormData,
): Promise<ShareNoteFormState> {
  const id = String(formData.get('id') ?? '');
  // The desired state travels as a string; anything that isn't exactly 'true'
  // means "stop sharing", so a mangled field fails closed rather than open.
  const isPublic = formData.get('isPublic') === 'true';

  // A page guard doesn't cover the actions that page renders — an action is a
  // separately addressable POST endpoint, so it re-checks the session itself.
  const user = await getCurrentUser();
  // `id` is form-supplied, so it is encoded rather than interpolated raw.
  if (!user) redirect(authenticateUrl(`/notes/${id}`));

  // Both slugs matter to the revalidation below: the address that must stop
  // serving the note, and the one that must start.
  let previousSlug: string | null = null;
  let nextSlug: string | null = null;

  try {
    // Read first — scoped by user_id, so someone else's note id simply isn't
    // found. This is what lets the action report "no longer exists" rather than
    // a silent no-op, and it is the only chance to learn the outgoing slug
    // before `setNotePublic` overwrites it.
    const existing = await getNoteById(user.id, id);

    if (!existing) {
      return { error: 'That note no longer exists.' };
    }

    previousSlug = existing.publicSlug;

    // Scoped by user_id in SQL as well: the id in the form is never trusted on
    // its own, even though the read above already established ownership.
    const note = await setNotePublic(user.id, id, isPublic);

    if (!note) {
      return { error: 'That note no longer exists.' };
    }

    nextSlug = note.publicSlug;
  } catch (error) {
    // The real failure goes to the log; the visitor gets a reference id and
    // nothing about the database.
    const reference = reportError('Failed to update note sharing', error);
    return {
      error: withReference('Could not change sharing for this note. Please try again.', reference),
    };
  }

  // The dashboard renders a "Public" badge per note, so it goes stale too.
  revalidatePath('/dashboard');
  revalidatePath(`/notes/${id}`);
  revalidatePath(`/notes/${id}/edit`);

  // Both addresses, and only when they differ: turning sharing off has to evict
  // the old public page, turning it on has to clear any cached 404 sitting at
  // the new slug.
  if (previousSlug) revalidatePath(`/p/${previousSlug}`);
  if (nextSlug && nextSlug !== previousSlug) revalidatePath(`/p/${nextSlug}`);

  return {};
}
