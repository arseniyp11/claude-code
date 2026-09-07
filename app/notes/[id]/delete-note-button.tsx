'use client';

import { useActionState, useRef } from 'react';

import {
  alertClass,
  dangerButtonClass,
  dangerOutlineButtonClass,
  secondaryLinkClass,
} from '@/components/form-styles';

import { deleteNoteAction, type DeleteNoteFormState } from './actions';

const initialState: DeleteNoteFormState = {};

type DeleteNoteButtonProps = {
  noteId: string;
  /** Quoted back in the prompt so it's clear *which* note is about to go. */
  title: string;
};

/**
 * Delete, behind a confirmation (SPEC §11: destructive actions are confirmed).
 *
 * The native <dialog> does the modal work — focus trap, inert background,
 * Esc to dismiss, backdrop — so there is no open/closed state to keep in React;
 * the element is the state. On success the action redirects to /dashboard, so
 * the dialog is only ever closed by the user changing their mind.
 */
export function DeleteNoteButton({ noteId, title }: DeleteNoteButtonProps) {
  const [state, formAction, pending] = useActionState(deleteNoteAction, initialState);

  const dialogRef = useRef<HTMLDialogElement>(null);

  return (
    <>
      <button
        type='button'
        className={dangerOutlineButtonClass}
        onClick={() => dialogRef.current?.showModal()}
      >
        Delete
      </button>

      <dialog
        ref={dialogRef}
        aria-labelledby='delete-note-heading'
        aria-describedby='delete-note-description'
        // `m-auto` restores the centering Tailwind's preflight strips: the UA
        // centers a modal dialog with `margin: auto`, which the reset zeroes.
        className='m-auto w-full max-w-sm rounded-lg border border-border bg-background p-6 text-foreground shadow-lg backdrop:bg-black/50'
      >
        <h2 id='delete-note-heading' className='text-lg font-semibold'>
          Delete this note?
        </h2>

        <p id='delete-note-description' className='mt-2 text-sm text-muted'>
          &ldquo;{title}&rdquo; will be permanently deleted, along with any public link to it. This
          can&rsquo;t be undone.
        </p>

        {state.error && (
          <p role='alert' className={`mt-4 ${alertClass}`}>
            {state.error}
          </p>
        )}

        {/* Cancel is a plain button rather than the idiomatic
            <form method="dialog"> — forms can't nest, and the delete itself
            has to be a form so the server action receives the note id. */}
        <form action={formAction} className='mt-6 flex items-center gap-2'>
          {/* The action re-derives ownership from the session, so this only
              says which note to delete — it never grants access to it. */}
          <input type='hidden' name='id' value={noteId} />

          <button type='submit' disabled={pending} className={dangerButtonClass}>
            {pending ? 'Deleting…' : 'Delete note'}
          </button>

          <button
            type='button'
            disabled={pending}
            className={secondaryLinkClass}
            onClick={() => dialogRef.current?.close()}
          >
            Cancel
          </button>
        </form>
      </dialog>
    </>
  );
}
