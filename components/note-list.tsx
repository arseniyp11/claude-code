import Link from 'next/link';

import { hintClass, primaryButtonClass } from '@/components/form-styles';
import { formatNoteDate, sqliteUtcToDate } from '@/lib/dates';

/**
 * The dashboard's list of notes (SPEC §8.3).
 *
 * The prop type is narrower than `Note` on purpose — the same reasoning as
 * `SiteHeader` taking `{ email }` rather than a user. `contentJson`, `userId`
 * and `publicSlug` have no business in this markup, and a component that cannot
 * see them cannot leak them.
 */
export type NoteListItem = {
  id: string;
  title: string;
  updatedAt: string;
  isPublic: boolean;
};

function UpdatedAt({ value }: { value: string }) {
  const date = sqliteUtcToDate(value);

  if (!date) return null;

  return (
    <time dateTime={date.toISOString()} className={hintClass}>
      Updated {formatNoteDate(value)} UTC
    </time>
  );
}

export function NoteList({ notes }: { notes: NoteListItem[] }) {
  if (notes.length === 0) {
    return (
      <div className='mt-8 rounded-lg border border-dashed border-border px-6 py-12 text-center'>
        <p className='font-medium'>No notes yet.</p>
        <p className={`mt-1 ${hintClass}`}>Your notes will show up here once you write one.</p>
        <Link href='/notes/new' className={`mt-6 inline-block ${primaryButtonClass}`}>
          New Note
        </Link>
      </div>
    );
  }

  return (
    <ul className='mt-8 divide-y divide-border border-y border-border'>
      {notes.map((note) => (
        <li key={note.id}>
          {/* The whole row is the link, so it's one tab stop and one target
              rather than a title anchor with dead space around it. */}
          <Link
            href={`/notes/${note.id}`}
            className='flex flex-col gap-1 px-1 py-4 outline-none hover:bg-surface focus-visible:ring-2 focus-visible:ring-accent'
          >
            <span className='flex items-center gap-2'>
              <span className='line-clamp-1 font-medium'>{note.title}</span>
              {note.isPublic && (
                // Spelled out rather than signalled with colour alone.
                <span className='shrink-0 rounded-full bg-surface px-2 py-0.5 text-xs text-muted'>
                  Public
                </span>
              )}
            </span>
            <UpdatedAt value={note.updatedAt} />
          </Link>
        </li>
      ))}
    </ul>
  );
}
