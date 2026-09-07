import { Placeholder } from '@tiptap/extensions';
import StarterKit from '@tiptap/starter-kit';

/**
 * The extension list that defines a note's document shape.
 *
 * This lives outside `components/note-editor.tsx` because that file is a
 * `"use client"` module: importing it from server code yields client
 * references, not the real extension objects. The server needs the real ones to
 * build a ProseMirror schema (`lib/tiptap-schema.ts`) and validate submitted
 * content against exactly what the editor will render — if the two lists could
 * drift, server validation would be checking a different document language than
 * the one the browser produces.
 *
 * StarterKit v3 already bundles Code and CodeBlock, so — unlike SPEC §9's
 * pre-v3 example — they must not be registered again here.
 */
export const noteExtensions = [StarterKit.configure({ heading: { levels: [1, 2, 3] } })];

/**
 * Editor-only extensions. These contribute no nodes or marks, so they are
 * irrelevant to the schema and stay out of `noteExtensions`.
 */
export function editorOnlyExtensions(placeholder: string) {
  return [Placeholder.configure({ placeholder })];
}
