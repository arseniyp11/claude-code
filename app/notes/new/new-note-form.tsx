'use client';

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

import { createNoteAction, type NewNoteFormState } from './actions';

const initialState: NewNoteFormState = {};

export function NewNoteForm() {
  const [state, formAction, pending] = useActionState(createNoteAction, initialState);

  const titleError = state.fieldErrors?.title;
  const contentError = state.fieldErrors?.content;

  return (
    <form action={formAction} className='flex flex-col gap-6'>
      {state.error && (
        <p role='alert' className={alertClass}>
          {state.error}
        </p>
      )}

      <div className='flex flex-col gap-1.5'>
        <label htmlFor='title' className='text-sm font-medium'>
          Title
        </label>
        <input
          id='title'
          name='title'
          type='text'
          maxLength={200}
          autoFocus
          autoComplete='off'
          placeholder='Untitled note'
          defaultValue={state.title}
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
        <NoteEditor name='contentJson' ariaLabelledBy='content-label' />
        {contentError && (
          <p role='alert' className={fieldErrorClass}>
            {contentError}
          </p>
        )}
      </div>

      <div className='flex flex-col gap-1.5'>
        <div className='flex items-center gap-2'>
          <input
            id='sharePublicly'
            name='sharePublicly'
            type='checkbox'
            aria-describedby='share-hint'
            className='size-4 accent-accent outline-none focus-visible:ring-2 focus-visible:ring-accent'
          />
          <label htmlFor='sharePublicly' className='text-sm font-medium'>
            Share this note publicly
          </label>
        </div>
        <p id='share-hint' className={hintClass}>
          Creates a link anyone can open without signing in. It appears once the note exists, and
          you can turn sharing off at any time.
        </p>
      </div>

      <div className='flex items-center gap-2'>
        <button type='submit' disabled={pending} className={primaryButtonClass}>
          {pending ? 'Creating note…' : 'Create note'}
        </button>

        <Link href='/dashboard' className={secondaryLinkClass}>
          Cancel
        </Link>
      </div>
    </form>
  );
}
