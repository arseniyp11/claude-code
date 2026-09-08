import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { cache } from 'react';

import { alertClass, hintClass } from '@/components/form-styles';
import { NoteContent } from '@/components/note-content';
import { PageContainer } from '@/components/page-container';
import { formatNoteDate, sqliteUtcToDate } from '@/lib/dates';
import { getNoteByPublicSlug } from '@/lib/notes';
import { parseDocument } from '@/lib/tiptap-schema';

/**
 * The public, read-only view of a shared note (SPEC §8.1).
 *
 * Deliberately session-blind: it never calls `getCurrentUser` or `requireUser`,
 * because who is reading has no bearing on what it shows. The slug is the whole
 * authorization story.
 */

type PublicNotePageProps = {
  params: Promise<{ slug: string }>;
};

const loadNote = cache(async (slug: string) => getNoteByPublicSlug(slug));

export async function generateMetadata({ params }: PublicNotePageProps): Promise<Metadata> {
  const { slug } = await params;
  const note = await loadNote(slug);

  return {
    title: note ? note.title : 'Note not found',
    // The slug is an unguessable capability URL. Letting a crawler index it
    // would quietly turn "anyone with the link" into "anyone with a search
    // engine", which is not the sharing the owner opted into.
    robots: { index: false, follow: false },
  };
}

export default async function PublicNotePage({ params }: PublicNotePageProps) {
  const { slug } = await params;

  // `is_public = 1` is part of the repository's WHERE clause, so a note whose
  // sharing was turned off is simply not found — 404, not a permission error,
  // and nothing distinguishes it from a slug that never existed.
  const note = await loadNote(slug);
  if (!note) notFound();

  const doc = parseDocument(note.contentJson);
  const updatedAt = sqliteUtcToDate(note.updatedAt);

  // Only the title, the timestamp and the content are rendered. The note's id
  // and `user_id` stay on the server: neither tells a reader anything they are
  // entitled to, and the id would hand them a URL to try against /notes/[id].
  return (
    <PageContainer>
      <h1 className='text-2xl font-semibold tracking-tight'>{note.title}</h1>
      {updatedAt && (
        <time dateTime={updatedAt.toISOString()} className={`mt-2 block ${hintClass}`}>
          Updated {formatNoteDate(note.updatedAt)} UTC
        </time>
      )}

      <div className='mt-8'>
        {doc ? (
          <NoteContent doc={doc} />
        ) : (
          <p role='alert' className={alertClass}>
            This note&rsquo;s content could not be displayed.
          </p>
        )}
      </div>

      <p className={`mt-12 border-t border-border pt-4 ${hintClass}`}>
        Shared read-only via NextNotes.
      </p>
    </PageContainer>
  );
}
