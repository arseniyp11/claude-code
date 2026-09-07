'use client';

import type { JSONContent } from '@tiptap/react';
import Link from 'next/link';
import { useActionState } from 'react';

import {
  alertClass,
  fieldClass,
  fieldErrorClass,
  hintClass,
  primaryButtonClass,
  secondaryLinkClass,
} from '@/components/form-styles';
import { NoteEditor } from '@/components/note-editor';

import { updateNoteAction, type EditNoteFormState } from './actions';

const initialState: EditNoteFormState = {};

type EditNoteFormProps = {
  note: {
    id: string;
    title: string;
    /** Already parsed by the page — the editor wants a document, not a string. */
    content: JSONContent;
    /**
     * True when the stored document failed validation and `content` is an empty
     * stand-in. The editor then refuses to submit, so the real row survives.
     */
    contentUnreadable?: boolean;
  };
};

export function EditNoteForm({ note }: EditNoteFormProps) {
  const [state, formAction, pending] = useActionState(updateNoteAction, initialState);

  const titleError = state.fieldErrors?.title;
  const contentError = state.fieldErrors?.content;

  return (
    <form action={formAction} className='flex flex-col gap-6'>
      {state.error && (
        <p role='alert' className={alertClass}>
          {state.error}
        </p>
      )}

      {/* The action re-derives ownership from the session, so this only says
          which note to update — it never grants access to it. */}
      <input type='hidden' name='id' value={note.id} />

      <div className='flex flex-col gap-1.5'>
        <label htmlFor='title' className='text-sm font-medium'>
          Title
        </label>
        <input
          id='title'
          name='title'
          type='text'
          maxLength={200}
          autoComplete='off'
          placeholder='Untitled note'
          // state.title first, so a failed submit keeps the user's edit rather
          // than snapping back to the stored title.
          defaultValue={state.title ?? note.title}
          aria-describedby={titleError ? 'title-error' : 'title-hint'}
          className={fieldClass}
        />
        {titleError ? (
          <p id='title-error' className={fieldErrorClass}>
            {titleError}
          </p>
        ) : (
          <p id='title-hint' className={hintClass}>
            Leave blank to call it &ldquo;Untitled note&rdquo;.
          </p>
        )}
      </div>

      <div className='flex flex-col gap-1.5'>
        <span id='content-label' className='text-sm font-medium'>
          Content
        </span>
        <NoteEditor
          name='contentJson'
          defaultContent={note.content}
          contentUnreadable={note.contentUnreadable}
          ariaLabelledBy='content-label'
        />
        {contentError && (
          <p role='alert' className={fieldErrorClass}>
            {contentError}
          </p>
        )}
      </div>

      <div className='flex items-center gap-2'>
        <button type='submit' disabled={pending} className={primaryButtonClass}>
          {pending ? 'Saving…' : 'Save changes'}
        </button>

        {/* Back to the note itself, not the dashboard — cancelling an edit
            should leave you looking at what you chose not to change. */}
        <Link href={`/notes/${note.id}`} className={secondaryLinkClass}>
          Cancel
        </Link>

        {/* aria-live so the confirmation is announced, not just shown. */}
        <p aria-live='polite' className={hintClass}>
          {state.saved && !pending ? 'Saved.' : ''}
        </p>
      </div>
    </form>
  );
}
