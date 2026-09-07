import type { ReactNode } from 'react';

import { safeHref } from '@/lib/safe-url';
import type { TiptapDoc } from '@/lib/tiptap';

/**
 * Read-only rendering of a note (SPEC §11).
 *
 * A note is stored as TipTap JSON and must never be turned into an HTML string
 * and injected: `dangerouslySetInnerHTML` is exactly the hole the JSON-first
 * design exists to close. This module walks the document into real React
 * elements instead, so every text run is escaped by React and every attribute
 * that reaches the DOM is one this file chose to put there.
 *
 * It is a plain module — no `"use client"`, no `server-only` — so a server
 * component can render it without shipping anything to the browser, and a client
 * component could still use it if one ever needs to.
 */

/**
 * The document has already passed `parseDocument`, so its node and mark *types*
 * are known-good. Their *attributes* are not: prosemirror-model validates
 * attribute names, never values. Everything read out of `attrs` below is
 * therefore treated as untrusted input.
 */
type RenderNode = {
  type: string;
  attrs?: Record<string, unknown>;
  content?: unknown[];
  marks?: unknown[];
  text?: string;
};

type RenderMark = {
  type: string;
  attrs?: Record<string, unknown>;
};

function asNode(value: unknown): RenderNode | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return null;
  }

  return typeof (value as RenderNode).type === 'string' ? (value as RenderNode) : null;
}

function asMark(value: unknown): RenderMark | null {
  return asNode(value) as RenderMark | null;
}

/**
 * `key={index}` is correct here rather than a compromise: this tree is built
 * once per request from an immutable document, is never reordered, filtered or
 * animated, and its nodes carry no identity of their own. A synthetic id would
 * add ceremony without adding stability.
 */
function renderNodes(content: unknown[] | undefined): ReactNode {
  if (!Array.isArray(content)) return null;

  return content.map((child, index) => {
    const node = asNode(child);

    return node ? <NoteNode key={index} node={node} /> : null;
  });
}

/** Wraps a text run in one mark. Unknown marks pass the child through. */
function wrapMark(mark: RenderMark, child: ReactNode): ReactNode {
  switch (mark.type) {
    case 'bold':
      return <strong>{child}</strong>;
    case 'italic':
      return <em>{child}</em>;
    case 'strike':
      return <s>{child}</s>;
    case 'underline':
      return <u>{child}</u>;
    case 'code':
      return <code>{child}</code>;
    case 'link': {
      const href = safeHref(mark.attrs?.href);

      // No usable target means no anchor at all — the text still reads, it just
      // isn't clickable. Emitting an <a> without href would be worse: it looks
      // like a link and does nothing.
      if (!href) return child;

      // The mark also carries `target`, `rel`, `class` and `title`, all of them
      // writable by whoever produced the document. None are forwarded; the
      // relationship attributes are fixed here instead. `nofollow` keeps a
      // shared note from becoming an SEO-spam vector, and noopener/noreferrer
      // pair with the hard-coded `target`.
      return (
        <a href={href} target='_blank' rel='noopener noreferrer nofollow'>
          {child}
        </a>
      );
    }
    default:
      return child;
  }
}

function renderText(node: RenderNode): ReactNode {
  if (typeof node.text !== 'string') return null;
  if (!Array.isArray(node.marks) || node.marks.length === 0) return node.text;

  // reduceRight, so marks[0] ends up outermost. That is the order ProseMirror's
  // own DOMSerializer opens them in, which keeps this output and the editor's
  // DOM structurally identical rather than merely equivalent.
  return node.marks.reduceRight<ReactNode>((child, value) => {
    const mark = asMark(value);

    return mark ? wrapMark(mark, child) : child;
  }, node.text);
}

/** `start` is unvalidated; only a sane positive integer survives. */
function listStart(attrs: Record<string, unknown> | undefined): number | undefined {
  const start = attrs?.start;

  return typeof start === 'number' && Number.isInteger(start) && start > 1 && start <= 10_000
    ? start
    : undefined;
}

/**
 * Highlighters read the language off a `language-x` class, so it has to reach
 * the DOM — but as an allowlisted token, never as free-form text.
 */
function languageClass(attrs: Record<string, unknown> | undefined): string | undefined {
  const language = attrs?.language;

  return typeof language === 'string' && /^[a-zA-Z0-9+#._-]{1,32}$/.test(language)
    ? `language-${language}`
    : undefined;
}

function NoteNode({ node }: { node: RenderNode }) {
  switch (node.type) {
    case 'paragraph':
      // An empty paragraph is a deliberate blank line. Without the <br /> it
      // would collapse to zero height and the spacing the author saw while
      // typing would be gone.
      return <p>{Array.isArray(node.content) ? renderNodes(node.content) : <br />}</p>;

    case 'heading':
      // Switched, not interpolated into a tag name: `level` is attacker-settable
      // and `h${level}` would let it name the element.
      switch (node.attrs?.level) {
        case 2:
          return <h2>{renderNodes(node.content)}</h2>;
        case 3:
          return <h3>{renderNodes(node.content)}</h3>;
        default:
          return <h1>{renderNodes(node.content)}</h1>;
      }

    case 'text':
      return <>{renderText(node)}</>;

    case 'bulletList':
      return <ul>{renderNodes(node.content)}</ul>;

    case 'orderedList':
      return <ol start={listStart(node.attrs)}>{renderNodes(node.content)}</ol>;

    case 'listItem':
      return <li>{renderNodes(node.content)}</li>;

    case 'blockquote':
      return <blockquote>{renderNodes(node.content)}</blockquote>;

    case 'codeBlock':
      // The schema gives codeBlock `marks: ""`, so its children are always bare
      // text nodes.
      return (
        <pre>
          <code className={languageClass(node.attrs)}>{renderNodes(node.content)}</code>
        </pre>
      );

    case 'hardBreak':
      return <br />;

    case 'horizontalRule':
      return <hr />;

    case 'doc':
      return <>{renderNodes(node.content)}</>;

    default:
      // Unreachable for documents `parseDocument` accepted — it only fires if
      // the extension list changes under stored content. Dropping the node is
      // the right failure mode: falling back to its raw text would resurrect
      // content the schema has stopped sanctioning.
      return null;
  }
}

type NoteContentProps = {
  /** A document that has already passed `parseDocument`. */
  doc: TiptapDoc;
  className?: string;
};

export function NoteContent({ doc, className }: NoteContentProps) {
  return (
    // `note-prose` is the same typography contract the editor mounts under, so
    // a note looks the same being read as it did being written.
    <div className={className ? `note-prose ${className}` : 'note-prose'}>
      {renderNodes(doc.content)}
    </div>
  );
}
