'use client';

import Link from 'next/link';
import { useActionState, useRef, useState, useSyncExternalStore } from 'react';

import { setNoteSharingAction, type ShareNoteFormState } from '@/app/notes/[id]/actions';
import { alertClass, fieldClass, hintClass, primaryButtonClass } from '@/components/form-styles';

/**
 * Public sharing control (SPEC §3.3, §8.3).
 *
 * There is deliberately no local `isPublic` state. The action revalidates the
 * page, the server re-renders with the new row, and the props arriving here are
 * the database's answer — so what the panel shows can never drift from what the
 * `/p/[slug]` route will actually serve.
 *
 * The toggle is a submit button rather than a checkbox with an onChange
 * handler: every other mutation in this app is a form submit, and this one keeps
 * working if the client JS never arrives.
 */

const initialState: ShareNoteFormState = {};

/**
 * The page's own origin, read the way React wants a browser-only value read.
 *
 * The origin is only knowable in the browser, so it cannot simply be computed
 * during render without the server and the client disagreeing. `useSyncExternal-
 * Store` is the sanctioned way to say that: the server snapshot is empty, the
 * client snapshot is the real origin, and React handles the swap after
 * hydration without a cascading render. Deriving it from `window` rather than an
 * env var keeps the link correct on localhost, on a LAN address and in
 * production with no configuration.
 *
 * These three live at module scope because they must be referentially stable —
 * a fresh `subscribe` each render would resubscribe on every pass.
 */
const subscribeToOrigin = () => () => {};
const getOrigin = () => window.location.origin;
const getServerOrigin = () => '';

type ShareToggleProps = {
  noteId: string;
  isPublic: boolean;
  /** Non-null exactly when `isPublic` — the repository keeps the two in step. */
  publicSlug: string | null;
};

export function ShareToggle({ noteId, isPublic, publicSlug }: ShareToggleProps) {
  const [state, formAction, pending] = useActionState(setNoteSharingAction, initialState);

  const path = publicSlug ? `/p/${publicSlug}` : '';

  const origin = useSyncExternalStore(subscribeToOrigin, getOrigin, getServerOrigin);

  // Before hydration `origin` is empty and this is the bare path — still a
  // correct, usable link, just not an absolute one.
  const shareUrl = path ? `${origin}${path}` : '';

  // Which link was copied, not whether one was. Storing the path is what makes
  // the confirmation self-expiring: turn sharing off and on, the slug changes,
  // and "Copied." stops matching without an effect to reset it.
  const [copiedPath, setCopiedPath] = useState<string | null>(null);
  const copied = copiedPath !== null && copiedPath === path;

  const urlRef = useRef<HTMLInputElement>(null);

  async function copyLink() {
    const input = urlRef.current;
    if (!input) return;

    // `navigator.clipboard` is undefined outside secure contexts — a plain-HTTP
    // LAN address, for instance. Selecting the field is the fallback: the user
    // can still copy, they just press the keys themselves.
    try {
      await navigator.clipboard.writeText(input.value);
      setCopiedPath(path);
    } catch {
      input.select();
      setCopiedPath(null);
    }
  }

  return (
    <section aria-labelledby='share-heading' className='rounded-lg border border-border p-4'>
      <h2 id='share-heading' className='text-sm font-medium'>
        Sharing
      </h2>

      {state.error && (
        <p role='alert' className={`mt-3 ${alertClass}`}>
          {state.error}
        </p>
      )}

      <form action={formAction} className='mt-3 flex flex-wrap items-center gap-3'>
        {/* The action re-derives ownership from the session, so these only say
            which note and which way — they never grant access to it. */}
        <input type='hidden' name='id' value={noteId} />
        <input type='hidden' name='isPublic' value={String(!isPublic)} />

        <button type='submit' disabled={pending} className={primaryButtonClass}>
          {pending ? 'Saving…' : isPublic ? 'Stop sharing' : 'Share publicly'}
        </button>

        <p className={hintClass}>
          {isPublic
            ? 'Anyone with the link below can read this note. They cannot edit or delete it.'
            : 'This note is private. Sharing creates a link that anyone can open, without signing in.'}
        </p>
      </form>

      {isPublic && publicSlug && (
        <div className='mt-4 flex flex-col gap-2'>
          <label htmlFor='share-url' className='text-sm font-medium'>
            Public link
          </label>

          <div className='flex flex-wrap items-center gap-2'>
            <input
              id='share-url'
              ref={urlRef}
              type='text'
              readOnly
              value={shareUrl}
              // Selecting on focus makes the manual copy path one gesture for
              // keyboard users, and costs nothing when the clipboard API works.
              onFocus={(event) => event.currentTarget.select()}
              className={`min-w-0 flex-1 ${fieldClass}`}
            />

            <button type='button' onClick={copyLink} className={primaryButtonClass}>
              Copy link
            </button>

            {/* A plain link, not a new-tab window.open: the owner may well want
                to check the note in this tab, and the back button then works. */}
            <Link href={path} className={primaryButtonClass}>
              Open
            </Link>
          </div>

          {/* Announced rather than merely shown — the button's own label does
              not change, so nothing else tells a screen reader it worked. */}
          <p aria-live='polite' className={hintClass}>
            {copied ? 'Copied.' : ''}
          </p>

          <p className={hintClass}>
            Turning sharing off breaks this link for good. Sharing again issues a different one.
          </p>
        </div>
      )}
    </section>
  );
}
