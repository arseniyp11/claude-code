// Pulls in the server-only schema validator.
import 'server-only';

import { z } from 'zod';

import { DEFAULT_TITLE } from './notes';
import { stripControlChars } from './sanitize';
import { parseDocument } from './tiptap-schema';

/**
 * Validation shared by the create and edit note actions (SPEC §3.2).
 *
 * Both forms write the same two columns, so a title acceptable on one page has
 * to be acceptable on the other. Keeping one schema is what guarantees that —
 * the two actions previously carried near-identical copies.
 */
export const noteInputSchema = z.object({
  // Blank is allowed and becomes the default title, matching SPEC §3.2 — the
  // point of "New Note" is to start writing, not to name things first.
  // Control characters are removed first so a title cannot smuggle newlines or
  // NULs into the database and, from there, into every page that renders it.
  title: z
    .string()
    .transform(stripControlChars)
    .pipe(z.string().trim().max(200, { message: 'Use at most 200 characters.' }))
    .transform((value) => (value.length > 0 ? value : DEFAULT_TITLE)),

  // The editor submits this through a hidden input, so it is user-controlled.
  // Anything that isn't a TipTap document this app can render is rejected
  // rather than stored.
  contentJson: z.string().refine((value) => parseDocument(value) !== null, {
    message: 'The note content could not be read. Please try again.',
  }),
});

export type NoteInput = z.infer<typeof noteInputSchema>;
