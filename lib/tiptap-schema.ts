// Builds a ProseMirror schema at module load; there is no reason to ship that
// to a browser, and `parseDocument` is only ever called while handling a
// request.
import 'server-only';

import { getSchema } from '@tiptap/core';

import { noteExtensions } from './tiptap-extensions';
import type { TiptapDoc } from './tiptap';

/**
 * Server-side validation of submitted note content (SPEC §11).
 *
 * The schema is derived from the same extension list the editor mounts, so
 * "valid here" and "renderable there" cannot drift apart.
 */
const schema = getSchema(noteExtensions);

/**
 * Upper bound on a serialized document, in bytes.
 *
 * Next caps a server action's body at 1 MB by default; this is the note-shaped
 * limit underneath it, checked before `JSON.parse` so an oversized payload is
 * rejected without being materialised as objects first.
 */
export const MAX_CONTENT_BYTES = 256 * 1024;

/**
 * Parses a serialized TipTap document, returning null for anything that isn't
 * one this app can actually render.
 *
 * The content reaches the server as a hidden form field, which is to say it is
 * attacker-controlled — a note's `content_json` must never become a place to
 * park arbitrary JSON.
 *
 * The structural check is the important part, and it is not optional: TipTap
 * does *not* validate content against its schema on load. `enableContentCheck`
 * defaults to false, and when a document contains a node no registered
 * extension claims, TipTap logs a warning and silently substitutes an empty
 * document. Left unchecked, opening such a note and pressing Save would
 * overwrite it with nothing. `schema.nodeFromJSON(...).check()` rejects both
 * that case and structurally invalid documents such as `{"type":"doc"}`, which
 * has no content where the schema requires at least one block.
 */
export function parseDocument(value: string): TiptapDoc | null {
  if (typeof value !== 'string') return null;
  if (Buffer.byteLength(value, 'utf8') > MAX_CONTENT_BYTES) return null;

  let parsed: unknown;

  try {
    parsed = JSON.parse(value);
  } catch {
    return null;
  }

  if (
    typeof parsed !== 'object' ||
    parsed === null ||
    Array.isArray(parsed) ||
    (parsed as { type?: unknown }).type !== 'doc'
  ) {
    return null;
  }

  try {
    // `nodeFromJSON` throws on unknown node and mark types; `check` throws when
    // the document's shape violates the schema's content expressions.
    schema.nodeFromJSON(parsed).check();
  } catch {
    return null;
  }

  return parsed as TiptapDoc;
}
