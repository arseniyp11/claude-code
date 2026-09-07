/**
 * TipTap document helpers shared by the client editor and server code.
 *
 * Deliberately free of `server-only`, of any DB or auth import, and of any
 * TipTap import: the editor component needs `EMPTY_DOC`, so this module has to
 * be importable from both sides of the boundary and must stay cheap to bundle.
 *
 * Validation of submitted documents lives in `lib/tiptap-schema.ts` instead —
 * it has to build a ProseMirror schema, which is server-side work.
 */

/**
 * The document TipTap produces for an untouched editor.
 *
 * Intentionally not `as const` — the editor takes it as a `JSONContent`, and a
 * readonly literal isn't assignable to that mutable type.
 */
export const EMPTY_DOC = {
  type: 'doc',
  content: [{ type: 'paragraph' }],
};

/** A TipTap node, as far as anything outside the editor needs to know. */
export type TiptapDoc = {
  type: 'doc';
  content?: unknown[];
};

/** True when the document holds no text and no block content worth saving. */
export function isEmptyDocument(doc: TiptapDoc): boolean {
  const content = doc.content;
  if (!Array.isArray(content) || content.length === 0) return true;

  return content.every(
    (node) =>
      typeof node === 'object' &&
      node !== null &&
      (node as { type?: unknown }).type === 'paragraph' &&
      !(node as { content?: unknown }).content,
  );
}
