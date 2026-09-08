import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { cache } from 'react';

import {
  alertClass,
  hintClass,
  primaryButtonClass,
  secondaryLinkClass,
} from '@/components/form-styles';
import { NoteContent } from '@/components/note-content';
import { PageContainer } from '@/components/page-container';
import { ShareToggle } from '@/components/share-toggle';
import { requireUser } from '@/lib/auth';
import { formatNoteDate, sqliteUtcToDate } from '@/lib/dates';
import { getNoteById } from '@/lib/notes';
import { parseDocument } from '@/lib/tiptap-schema';

import { DeleteNoteButton } from './delete-note-button';

type NotePageProps = {
  params: Promise<{ id: string }>;
};

/**
 * Next renders `generateMetadata` and the page concurrently, and both need the
 * note. Memoizing per request collapses that into one SQLite read — the same
 * reason `getSession` is wrapped in `cache` over in `lib/auth.ts`.
 */
const loadNote = cache(async (userId: string, noteId: string) => getNoteById(userId, noteId));

export async function generateMetadata({ params }: NotePageProps): Promise<Metadata> {
  const { id } = await params;
  const user = await requireUser(`/notes/${id}`);
  const note = await loadNote(user.id, id);

  return { title: note ? note.title : 'Note not found' };
}

export default async function NotePage({ params }: NotePageProps) {
  const { id } = await params;
  const user = await requireUser(`/notes/${id}`);

  // Scoped by user_id in SQL, so another user's note is indistinguishable from
  // one that doesn't exist — 404, never a permission error.
  const note = await loadNote(user.id, id);
  if (!note) notFound();

  // Validated against the same schema the editor mounts, so anything non-null
  // here is renderable. Unlike the editor there is no `EMPTY_DOC` fallback:
  // nothing on this page can overwrite the row, so a document we can't read is
  // reported rather than papered over with a blank one.
  const doc = parseDocument(note.contentJson);
  const updatedAt = sqliteUtcToDate(note.updatedAt);

  return (
    <PageContainer>
      <div className='flex flex-wrap items-start justify-between gap-4'>
        <div>
          <h1 className='text-2xl font-semibold tracking-tight'>{note.title}</h1>
          {updatedAt && (
            <time dateTime={updatedAt.toISOString()} className={`mt-2 block ${hintClass}`}>
              Updated {formatNoteDate(note.updatedAt)} UTC
            </time>
          )}
        </div>

        <div className='flex items-center gap-2'>
          <Link href={`/notes/${id}/edit`} className={primaryButtonClass}>
            Edit
          </Link>
          <DeleteNoteButton noteId={id} title={note.title} />
          <Link href='/dashboard' className={secondaryLinkClass}>
            Back to dashboard
          </Link>
        </div>
      </div>

      <div className='mt-8'>
        <ShareToggle noteId={id} isPublic={note.isPublic} publicSlug={note.publicSlug} />
      </div>

      <div className='mt-8'>
        {doc ? (
          <NoteContent doc={doc} />
        ) : (
          // The Edit link above stays reachable: the editor has its own guard
          // for this, which opens the note without letting a save through.
          <p role='alert' className={alertClass}>
            This note&rsquo;s content could not be displayed.
          </p>
        )}
      </div>
    </PageContainer>
  );
}
