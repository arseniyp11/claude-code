import type { Metadata } from 'next';
import Link from 'next/link';

import { primaryButtonClass } from '@/components/form-styles';

export const metadata: Metadata = {
  title: 'Not found',
};

/**
 * 404 page (SPEC §11).
 *
 * Reached by `notFound()` in the note editor route, where a note belonging to
 * someone else and a note that never existed are deliberately indistinguishable
 * — so the copy here must not hint that the note might exist for someone.
 */
export default function NotFound() {
  return (
    <div className='mx-auto w-full max-w-3xl px-6 py-16'>
      <h1 className='text-2xl font-semibold tracking-tight'>Not found</h1>

      <p className='mt-3 text-muted'>
        We couldn&rsquo;t find that page. It may have been deleted, or the link may be wrong.
      </p>

      <div className='mt-8'>
        <Link href='/dashboard' className={primaryButtonClass}>
          Back to dashboard
        </Link>
      </div>
    </div>
  );
}
