import type { Metadata } from 'next';
import Link from 'next/link';

import { primaryButtonClass } from '@/components/form-styles';
import { NoteList } from '@/components/note-list';
import { PageContainer } from '@/components/page-container';
import { requireUser } from '@/lib/auth';
import { getNotesByUser } from '@/lib/notes';

export const metadata: Metadata = {
  title: 'Dashboard',
};

export default async function DashboardPage() {
  const user = await requireUser('/dashboard');

  // Scoped by user_id in SQL, so this can only ever return the caller's notes.
  const notes = await getNotesByUser(user.id);

  return (
    <PageContainer>
      <div className='flex flex-wrap items-center justify-between gap-4'>
        <div>
          <h1 className='text-2xl font-semibold tracking-tight'>Dashboard</h1>
          <p className='mt-2 text-sm text-muted'>Signed in as {user.email}.</p>
        </div>

        <Link href='/notes/new' className={primaryButtonClass}>
          New Note
        </Link>
      </div>

      {/* Only the fields the list renders are handed over — the row objects
          also carry the note body, which has no reason to cross this boundary. */}
      <NoteList
        notes={notes.map(({ id, title, updatedAt, isPublic }) => ({
          id,
          title,
          updatedAt,
          isPublic,
        }))}
      />
    </PageContainer>
  );
}
