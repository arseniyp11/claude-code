'use client';

import Link from 'next/link';

import { primaryButtonClass } from '@/components/form-styles';

/**
 * Route-level error boundary (SPEC §4).
 *
 * Renders `error.digest` and nothing else from the error. Next redacts
 * `error.message` in production but passes the real one through in development,
 * so showing it would leak internals the moment this shipped. The digest is the
 * id Next already writes to the server log, which makes it the one value that
 * is both safe to show and useful to quote.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className='mx-auto w-full max-w-3xl px-6 py-16'>
      <h1 className='text-2xl font-semibold tracking-tight'>Something went wrong</h1>

      <p className='mt-3 text-muted'>
        We couldn&rsquo;t load this page. Trying again often works; if it doesn&rsquo;t, come back
        in a few minutes.
      </p>

      {error.digest && (
        <p className='mt-2 text-xs text-muted'>
          Reference: <code>{error.digest}</code>
        </p>
      )}

      <div className='mt-8 flex flex-wrap items-center gap-3'>
        <button type='button' onClick={reset} className={primaryButtonClass}>
          Try again
        </button>

        <Link
          href='/dashboard'
          className='rounded-md border border-border px-4 py-2 text-sm font-medium outline-none hover:bg-surface focus-visible:ring-2 focus-visible:ring-accent'
        >
          Back to dashboard
        </Link>
      </div>
    </div>
  );
}
