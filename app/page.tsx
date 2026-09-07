import Link from 'next/link';

import { getCurrentUser } from '@/lib/auth';

const primaryLinkClass =
  'rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background outline-none hover:opacity-90 focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background';

const secondaryLinkClass =
  'rounded-md border border-border px-4 py-2 text-sm font-medium outline-none hover:bg-surface focus-visible:ring-2 focus-visible:ring-accent';

export default async function Home() {
  const user = await getCurrentUser();

  return (
    <div className='mx-auto w-full max-w-3xl px-6 py-16'>
      <h1 className='text-3xl font-semibold tracking-tight'>NextNotes</h1>
      <p className='mt-3 text-muted'>
        Write rich-text notes, and share any of them with a public link.
      </p>

      <div className='mt-8 flex flex-wrap items-center gap-3'>
        {user ? (
          <Link href='/dashboard' className={primaryLinkClass}>
            Go to dashboard
          </Link>
        ) : (
          <>
            <Link href='/authenticate?mode=signup' className={primaryLinkClass}>
              Sign up
            </Link>
            <Link href='/authenticate' className={secondaryLinkClass}>
              Log in
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
