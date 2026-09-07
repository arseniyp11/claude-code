'use client';

import {
  EditorContent,
  useEditor,
  useEditorState,
  type Editor,
  type JSONContent,
} from '@tiptap/react';
import { useMemo, useState } from 'react';

import { alertClass } from '@/components/form-styles';
import { editorOnlyExtensions, noteExtensions } from '@/lib/tiptap-extensions';
import { EMPTY_DOC } from '@/lib/tiptap';

/**
 * TipTap editor (SPEC §9).
 *
 * The document is serialized into a hidden input as JSON, so the editor drops
 * into an ordinary `<form>` and its content arrives in the server action's
 * FormData — no fetch, no editor state lifted into the page. The server
 * re-validates that string regardless; a hidden input is user-controlled.
 *
 * The schema-bearing extensions live in `lib/tiptap-extensions.ts` so the
 * server can validate against the same list this editor mounts.
 */

type NoteEditorProps = {
  /** FormData key the serialized document is submitted under. */
  name: string;
  defaultContent?: JSONContent;
  /**
   * Set by the server when the stored document failed validation and
   * `defaultContent` is an empty stand-in rather than the real note. Submitting
   * would then overwrite the note with that blank document, so the editor
   * withholds its hidden input instead.
   */
  contentUnreadable?: boolean;
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
      label: 'Bold',
      face: 'B',
      isActive: (e) => e.isActive('bold'),
      run: (e) => e.chain().focus().toggleBold().run(),
    },
    {
      label: 'Italic',
      face: 'I',
      isActive: (e) => e.isActive('italic'),
      run: (e) => e.chain().focus().toggleItalic().run(),
    },
  ],
  [
    {
      label: 'Paragraph',
      face: '¶',
      isActive: (e) => e.isActive('paragraph'),
      run: (e) => e.chain().focus().setParagraph().run(),
    },
    {
      label: 'Heading 1',
      face: 'H1',
      isActive: (e) => e.isActive('heading', { level: 1 }),
      run: (e) => e.chain().focus().toggleHeading({ level: 1 }).run(),
    },
    {
      label: 'Heading 2',
      face: 'H2',
      isActive: (e) => e.isActive('heading', { level: 2 }),
      run: (e) => e.chain().focus().toggleHeading({ level: 2 }).run(),
    },
    {
      label: 'Heading 3',
      face: 'H3',
      isActive: (e) => e.isActive('heading', { level: 3 }),
      run: (e) => e.chain().focus().toggleHeading({ level: 3 }).run(),
    },
  ],
  [
    {
      label: 'Bullet list',
      face: '• List',
      isActive: (e) => e.isActive('bulletList'),
      run: (e) => e.chain().focus().toggleBulletList().run(),
    },
  ],
  [
    {
      label: 'Inline code',
      face: 'Code',
      isActive: (e) => e.isActive('code'),
      run: (e) => e.chain().focus().toggleCode().run(),
    },
    {
      label: 'Code block',
      face: 'Block',
      isActive: (e) => e.isActive('codeBlock'),
      run: (e) => e.chain().focus().toggleCodeBlock().run(),
    },
    {
      label: 'Horizontal rule',
      face: '—',
      isActive: () => false,
      run: (e) => e.chain().focus().setHorizontalRule().run(),
    },
  ],
];

const flatItems = groups.flat();

const toolbarButtonClass =
  'min-w-8 rounded px-2 py-1 text-sm outline-none hover:bg-background focus-visible:ring-2 focus-visible:ring-accent aria-pressed:bg-background aria-pressed:font-semibold';

export function NoteEditor({
  name,
  defaultContent,
  contentUnreadable = false,
  ariaLabelledBy,
  placeholder = 'Start writing…',
}: NoteEditorProps) {
  const initial: JSONContent = defaultContent ?? EMPTY_DOC;
  const initialJson = useMemo(() => JSON.stringify(initial), [initial]);

  // Genuine state: it records that something happened (TipTap rejected the
  // content on load), which is not derivable from the editor afterwards. The
  // server's verdict is the usual trigger; this catches the case where the
  // browser's schema disagrees with it.
  const [editorRejectedContent, setEditorRejectedContent] = useState(false);
  const blocked = contentUnreadable || editorRejectedContent;

  const extensions = useMemo(
    () => [...noteExtensions, ...editorOnlyExtensions(placeholder)],
    [placeholder],
  );

  const editor = useEditor({
    extensions,
    content: initial,
    // Required under Next's SSR: rendering on the server desyncs from the
    // client's first paint and throws a hydration mismatch.
    immediatelyRender: false,
    // These two go together. Without the handler, TipTap's default
    // `onContentError` rethrows and takes the render down; without the check,
    // TipTap silently swaps unreadable content for an empty document and the
    // next save would overwrite the stored note with nothing.
    enableContentCheck: true,
    onContentError: () => setEditorRejectedContent(true),
    editorProps: {
      attributes: {
        // `note-prose` is the shared typography contract in globals.css, the
        // same one `components/note-content.tsx` renders under — that is what
        // makes the editor a preview of the view page rather than a lookalike.
        class: 'note-prose min-h-48 px-3 py-2',
        role: 'textbox',
        'aria-multiline': 'true',
        ...(ariaLabelledBy ? { 'aria-labelledby': ariaLabelledBy } : {}),
      },
    },
  });

  // Derived, not mirrored: the editor already owns the document, so keeping a
  // second copy in state only creates a way for the two to disagree.
  //
  // ProseMirror documents are immutable, so comparing by identity means the
  // selector settles whenever the document is untouched — a caret move bumps
  // the transaction counter but yields the same `doc`, so no re-serialization.
  const doc = useEditorState({
    editor,
    selector: ({ editor }) => editor?.state.doc ?? null,
    equalityFn: (a, b) => a === b,
  });

  const json = useMemo(
    () => (doc ? JSON.stringify(doc.toJSON()) : initialJson),
    [doc, initialJson],
  );

  return (
    <div className='flex flex-col gap-2'>
      <div className='rounded-md border border-border focus-within:border-transparent focus-within:ring-2 focus-within:ring-accent'>
        {editor ? <Toolbar editor={editor} /> : <ToolbarPlaceholder />}

        {/* min-h matches the editable area so the layout doesn't jump when the
            editor mounts a tick after hydration. */}
        <EditorContent editor={editor} className='min-h-48' />

        {/* Omitted entirely when the stored document could not be read, so the
            field arrives absent, the server rejects the submission, and the
            note on disk is left alone rather than replaced by a blank one. */}
        {!blocked && <input type='hidden' name={name} value={json} readOnly />}
      </div>

      {blocked && (
        <p role='alert' className={alertClass}>
          This note&rsquo;s content could not be opened, so it cannot be saved from here — saving
          now would replace it with an empty note. Copy anything you still need, then reload the
          page.
        </p>
      )}
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
      Object.fromEntries(flatItems.map((item) => [item.label, item.isActive(editor)])) as Record<
        string,
        boolean
      >,
  });

  return (
    <div
      role='toolbar'
      aria-label='Formatting'
      className='flex flex-wrap items-center gap-1 border-b border-border bg-surface px-2 py-1.5'
    >
      {groups.map((group, groupIndex) => (
        <div key={group[0].label} className='flex items-center gap-1'>
          {groupIndex > 0 && <span aria-hidden='true' className='mx-1 h-4 w-px bg-border' />}

          {group.map((item) => (
            <button
              key={item.label}
              // Without this these would submit the form they sit inside.
              type='button'
              onClick={() => item.run(editor)}
              aria-label={item.label}
              aria-pressed={active[item.label]}
              className={toolbarButtonClass}
            >
              <span aria-hidden='true'>{item.face}</span>
            </button>
          ))}
        </div>
      ))}
    </div>
  );
}

/** Holds the toolbar's height for the tick before the editor mounts. */
function ToolbarPlaceholder() {
  return <div aria-hidden='true' className='h-[38px] border-b border-border bg-surface' />;
}
