"use client";

import { Placeholder } from "@tiptap/extensions";
import {
  EditorContent,
  useEditor,
  useEditorState,
  type Editor,
  type JSONContent,
} from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useMemo, useState } from "react";

import { EMPTY_DOC } from "@/lib/tiptap";

/**
 * TipTap editor (SPEC §9).
 *
 * The document is mirrored into a hidden input as JSON, so the editor drops
 * into an ordinary `<form>` and its content arrives in the server action's
 * FormData — no fetch, no editor state lifted into the page. The server
 * re-validates that string regardless; a hidden input is user-controlled.
 *
 * StarterKit v3 already bundles Code and CodeBlock, so — unlike SPEC §9's
 * pre-v3 example — they must not be registered again here.
 */

type NoteEditorProps = {
  /** FormData key the serialized document is submitted under. */
  name: string;
  defaultContent?: JSONContent;
  /** Id of the element naming this editor, for screen readers. */
  ariaLabelledBy?: string;
  placeholder?: string;
};

type ToolbarItem = {
  label: string;
  /** Short text for the button face; `label` remains the accessible name. */
  face: string;
  isActive: (editor: Editor) => boolean;
  run: (editor: Editor) => void;
};

/** Toolbar groups, rendered with a separator between each. */
const groups: ToolbarItem[][] = [
  [
    {
      label: "Bold",
      face: "B",
      isActive: (e) => e.isActive("bold"),
      run: (e) => e.chain().focus().toggleBold().run(),
    },
    {
      label: "Italic",
      face: "I",
      isActive: (e) => e.isActive("italic"),
      run: (e) => e.chain().focus().toggleItalic().run(),
    },
  ],
  [
    {
      label: "Paragraph",
      face: "¶",
      isActive: (e) => e.isActive("paragraph"),
      run: (e) => e.chain().focus().setParagraph().run(),
    },
    {
      label: "Heading 1",
      face: "H1",
      isActive: (e) => e.isActive("heading", { level: 1 }),
      run: (e) => e.chain().focus().toggleHeading({ level: 1 }).run(),
    },
    {
      label: "Heading 2",
      face: "H2",
      isActive: (e) => e.isActive("heading", { level: 2 }),
      run: (e) => e.chain().focus().toggleHeading({ level: 2 }).run(),
    },
    {
      label: "Heading 3",
      face: "H3",
      isActive: (e) => e.isActive("heading", { level: 3 }),
      run: (e) => e.chain().focus().toggleHeading({ level: 3 }).run(),
    },
  ],
  [
    {
      label: "Bullet list",
      face: "• List",
      isActive: (e) => e.isActive("bulletList"),
      run: (e) => e.chain().focus().toggleBulletList().run(),
    },
  ],
  [
    {
      label: "Inline code",
      face: "Code",
      isActive: (e) => e.isActive("code"),
      run: (e) => e.chain().focus().toggleCode().run(),
    },
    {
      label: "Code block",
      face: "Block",
      isActive: (e) => e.isActive("codeBlock"),
      run: (e) => e.chain().focus().toggleCodeBlock().run(),
    },
    {
      label: "Horizontal rule",
      face: "—",
      isActive: () => false,
      run: (e) => e.chain().focus().setHorizontalRule().run(),
    },
  ],
];

const flatItems = groups.flat();

const toolbarButtonClass =
  "min-w-8 rounded px-2 py-1 text-sm outline-none hover:bg-background focus-visible:ring-2 focus-visible:ring-accent aria-pressed:bg-background aria-pressed:font-semibold";

export function NoteEditor({
  name,
  defaultContent,
  ariaLabelledBy,
  placeholder = "Start writing…",
}: NoteEditorProps) {
  const initial: JSONContent = defaultContent ?? EMPTY_DOC;
  const [json, setJson] = useState(() => JSON.stringify(initial));

  const extensions = useMemo(
    () => [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      Placeholder.configure({ placeholder }),
    ],
    [placeholder],
  );

  const editor = useEditor({
    extensions,
    content: initial,
    // Required under Next's SSR: rendering on the server desyncs from the
    // client's first paint and throws a hydration mismatch.
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: "min-h-48 px-3 py-2",
        role: "textbox",
        "aria-multiline": "true",
        ...(ariaLabelledBy ? { "aria-labelledby": ariaLabelledBy } : {}),
      },
    },
    onUpdate: ({ editor }) => setJson(JSON.stringify(editor.getJSON())),
  });

  return (
    <div className="rounded-md border border-border focus-within:border-transparent focus-within:ring-2 focus-within:ring-accent">
      {editor ? <Toolbar editor={editor} /> : <ToolbarPlaceholder />}

      {/* min-h matches the editable area so the layout doesn't jump when the
          editor mounts a tick after hydration. */}
      <EditorContent editor={editor} className="min-h-48" />

      <input type="hidden" name={name} value={json} readOnly />
    </div>
  );
}

function Toolbar({ editor }: { editor: Editor }) {
  // Recomputes on every selection and document change, so `aria-pressed` tracks
  // the caret instead of going stale after the first paint. A fresh object each
  // call is fine: useEditorState compares selections with deepEqual.
  const active = useEditorState({
    editor,
    selector: ({ editor }) =>
      Object.fromEntries(
        flatItems.map((item) => [item.label, item.isActive(editor)]),
      ) as Record<string, boolean>,
  });

  return (
    <div
      role="toolbar"
      aria-label="Formatting"
      className="flex flex-wrap items-center gap-1 border-b border-border bg-surface px-2 py-1.5"
    >
      {groups.map((group, groupIndex) => (
        <div key={group[0].label} className="flex items-center gap-1">
          {groupIndex > 0 && (
            <span aria-hidden="true" className="mx-1 h-4 w-px bg-border" />
          )}

          {group.map((item) => (
            <button
              key={item.label}
              // Without this these would submit the form they sit inside.
              type="button"
              onClick={() => item.run(editor)}
              aria-label={item.label}
              aria-pressed={active[item.label]}
              className={toolbarButtonClass}
            >
              <span aria-hidden="true">{item.face}</span>
            </button>
          ))}
        </div>
      ))}
    </div>
  );
}

/** Holds the toolbar's height for the tick before the editor mounts. */
function ToolbarPlaceholder() {
  return (
    <div
      aria-hidden="true"
      className="h-[38px] border-b border-border bg-surface"
    />
  );
}
