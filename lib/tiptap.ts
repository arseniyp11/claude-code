/**
 * TipTap document helpers shared by the client editor and the server action.
 *
 * Deliberately free of `server-only` and of any DB or auth import: the editor
 * component needs `EMPTY_DOC`, and the action needs `parseDocument`, so this
 * module has to be importable from both sides of the boundary.
 */

/**
 * The document TipTap produces for an untouched editor.
 *
 * Intentionally not `as const` — the editor takes it as a `JSONContent`, and a
 * readonly literal isn't assignable to that mutable type.
 */
export const EMPTY_DOC = {
  type: "doc",
  content: [{ type: "paragraph" }],
};

/** A TipTap node, as far as anything outside the editor needs to know. */
export type TiptapDoc = {
  type: "doc";
  content?: unknown[];
};

/**
 * Parses a serialized TipTap document, returning null for anything that isn't
 * one.
 *
 * The content reaches the server as a hidden form field, which is to say it is
 * attacker-controlled — a note's `content_json` must never become a place to
 * park arbitrary JSON. Structure beyond the top-level node is left to TipTap's
 * own schema, which discards unknown nodes when the document is loaded.
 */
export function parseDocument(value: string): TiptapDoc | null {
  let parsed: unknown;

  try {
    parsed = JSON.parse(value);
  } catch {
    return null;
  }

  if (
    typeof parsed !== "object" ||
    parsed === null ||
    Array.isArray(parsed) ||
    (parsed as { type?: unknown }).type !== "doc"
  ) {
    return null;
  }

  return parsed as TiptapDoc;
}

/** True when the document holds no text and no block content worth saving. */
export function isEmptyDocument(doc: TiptapDoc): boolean {
  const content = doc.content;
  if (!Array.isArray(content) || content.length === 0) return true;

  return content.every(
    (node) =>
      typeof node === "object" &&
      node !== null &&
      (node as { type?: unknown }).type === "paragraph" &&
      !(node as { content?: unknown }).content,
  );
}
