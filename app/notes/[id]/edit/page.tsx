import type { JSONContent } from '@tiptap/react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { ShareToggle } from '@/components/share-toggle';
import { requireUser } from '@/lib/auth';
import { getNoteById } from '@/lib/notes';
import { EMPTY_DOC } from '@/lib/tiptap';
import { parseDocument } from '@/lib/tiptap-schema';

import { EditNoteForm } from './edit-note-form';

type NotePageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: NotePageProps): Promise<Metadata> {
  const { id } = await params;
  const user = await requireUser(`/notes/${id}/edit`);
  const note = await getNoteById(user.id, id);

  return { title: note ? `Edit · ${note.title}` : 'Note not found' };
}

export default async function EditNotePage({ params }: NotePageProps) {
  const { id } = await params;
  const user = await requireUser(`/notes/${id}/edit`);

  // Scoped by user_id in SQL, so another user's note is indistinguishable from
  // one that doesn't exist — 404, never a permission error.
  const note = await getNoteById(user.id, id);
  if (!note) notFound();

  // `parseDocument` checks the document against the same ProseMirror schema the
  // editor mounts, so anything it returns is renderable.
  const parsed = parseDocument(note.contentJson);

  // A row it rejects — a bad write, or content from an extension since removed
  // — opens as an empty editor rather than throwing. That substitution is
  // presentation only, and the form has to be told it happened: an editor that
  // silently showed this blank document would overwrite the real note the
  // moment the user pressed Save.
  const content = (parsed ?? EMPTY_DOC) as JSONContent;

  return (
    <div className='mx-auto w-full max-w-3xl p-6'>
      <h1 className='text-2xl font-semibold tracking-tight'>Edit note</h1>
      <p className='mt-2 text-sm text-muted'>Changes are saved when you choose Save changes.</p>

      {/* A sibling of the form, never a field inside it: sharing has its own
          action, and forms cannot nest. Toggling it also takes effect
          immediately, so abandoning an edit can't quietly revert it. */}
      <div className='mt-8'>
        <ShareToggle noteId={note.id} isPublic={note.isPublic} publicSlug={note.publicSlug} />
      </div>

      <div className='mt-8'>
        <EditNoteForm
          note={{
            id: note.id,
            title: note.title,
            content,
            contentUnreadable: parsed === null,
          }}
        />
      </div>
    </div>
  );
}
