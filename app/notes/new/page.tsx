import type { Metadata } from 'next';

import { PageContainer } from '@/components/page-container';
import { requireUser } from '@/lib/auth';

import { NewNoteForm } from './new-note-form';

export const metadata: Metadata = {
  title: 'New note',
};

// A static segment wins over a sibling dynamic one, so this route is reached
// for /notes/new and never resolves to /notes/[id].
export default async function NewNotePage() {
  await requireUser('/notes/new');

  return (
    <PageContainer>
      <h1 className='text-2xl font-semibold tracking-tight'>New note</h1>
      <p className='mt-2 text-sm text-muted'>
        Give it a title and start writing. You can share it now or later.
      </p>

      <div className='mt-8'>
        <NewNoteForm />
      </div>
    </PageContainer>
  );
}
