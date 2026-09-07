import Link from 'next/link';

import { signOutAction } from '@/app/authenticate/actions';

const navLinkClass =
  'rounded-md px-2 py-1 underline-offset-4 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-accent';

/**
 * The session is resolved on the server by the caller and handed down as a
 * prop — this component never looks one up and never imports `lib/auth`, so
 * there is exactly one session read per request and no auth logic in the view.
 *
 * The prop is narrowed to the fields actually rendered rather than the full
 * better-auth `User`, so nothing else can leak into the markup by accident.
 */
export type SiteHeaderUser = { email: string };

export function SiteHeader({ user }: { user: SiteHeaderUser | null }) {
  return (
    <header className='sticky top-0 z-10 border-b border-border bg-surface'>
      <div className='mx-auto flex w-full max-w-3xl items-center justify-between gap-4 px-6 py-3'>
        <Link
          href={user ? '/dashboard' : '/'}
          className='rounded-md text-sm font-semibold tracking-tight outline-none focus-visible:ring-2 focus-visible:ring-accent'
        >
          NextNotes
        </Link>

        <nav className='flex items-center gap-3 text-sm'>
          {user ? (
            <>
              <span className='text-muted'>{user.email}</span>
              <form action={signOutAction}>
                <button type='submit' className={navLinkClass}>
                  Sign out
                </button>
              </form>
            </>
          ) : (
            <Link href='/authenticate' className={navLinkClass}>
              Sign in
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
