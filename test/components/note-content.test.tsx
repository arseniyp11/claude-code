import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { NoteContent } from '@/components/note-content';
import type { TiptapDoc } from '@/lib/tiptap';

/**
 * `NoteContent` is the read-only rendering path for arbitrary stored TipTap
 * JSON (SPEC §11) — it is where a hostile `href` or `language` attribute would
 * turn into markup if it were going to. `renderToStaticMarkup` exercises the
 * real component tree without needing a DOM (jsdom is not installed here).
 */
function render(doc: unknown): string {
  return renderToStaticMarkup(<NoteContent doc={doc as TiptapDoc} />);
}

describe('NoteContent', () => {
  it('renders headings at the given level, defaulting unknown levels to h1', () => {
    const html = render({
      type: 'doc',
      content: [
        { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Two' }] },
        { type: 'heading', attrs: { level: 99 }, content: [{ type: 'text', text: 'Default' }] },
      ],
    });

    expect(html).toContain('<h2>Two</h2>');
    expect(html).toContain('<h1>Default</h1>');
  });

  it('renders an empty paragraph as a line break, not a collapsed line', () => {
    const html = render({ type: 'doc', content: [{ type: 'paragraph' }] });
    expect(html).toContain('<p><br/></p>');
  });

  it('nests marks in ProseMirror order, outermost first', () => {
    const html = render({
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'hi', marks: [{ type: 'bold' }, { type: 'italic' }] }],
        },
      ],
    });

    expect(html).toContain('<strong><em>hi</em></strong>');
  });

  it('renders a safe link with a fixed rel/target', () => {
    const html = render({
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: 'click',
              marks: [{ type: 'link', attrs: { href: 'https://example.com' } }],
            },
          ],
        },
      ],
    });

    expect(html).toContain('href="https://example.com/"');
    expect(html).toContain('target="_blank"');
    expect(html).toContain('rel="noopener noreferrer nofollow"');
  });

  it('drops a javascript: link, rendering plain text instead of an anchor', () => {
    const html = render({
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: 'click',
              marks: [{ type: 'link', attrs: { href: 'javascript:alert(1)' } }],
            },
          ],
        },
      ],
    });

    expect(html).not.toContain('<a');
    expect(html).toContain('click');
  });

  it('ignores attacker-supplied target/rel/class/title on a link mark', () => {
    const html = render({
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: 'click',
              marks: [
                {
                  type: 'link',
                  attrs: {
                    href: 'https://example.com',
                    target: '_self',
                    rel: 'nofollow'.repeat(0),
                    class: 'injected',
                    title: 'x" onmouseover="alert(1)',
                  },
                },
              ],
            },
          ],
        },
      ],
    });

    expect(html).not.toContain('class="injected"');
    expect(html).not.toContain('onmouseover');
    expect(html).toContain('target="_blank"');
  });

  it('allowlists the code-block language class and drops an unsafe one', () => {
    const safe = render({
      type: 'doc',
      content: [
        { type: 'codeBlock', attrs: { language: 'js' }, content: [{ type: 'text', text: 'x' }] },
      ],
    });
    expect(safe).toContain('class="language-js"');

    const unsafe = render({
      type: 'doc',
      content: [
        {
          type: 'codeBlock',
          attrs: { language: '"><script>alert(1)</script>' },
          content: [{ type: 'text', text: 'x' }],
        },
      ],
    });
    expect(unsafe).not.toContain('<script>');
    expect(unsafe).not.toContain('class="language-');
  });

  it('clamps an out-of-range ordered list start attribute', () => {
    const inRange = render({
      type: 'doc',
      content: [
        {
          type: 'orderedList',
          attrs: { start: 5 },
          content: [{ type: 'listItem', content: [{ type: 'paragraph' }] }],
        },
      ],
    });
    expect(inRange).toContain('start="5"');

    const outOfRange = render({
      type: 'doc',
      content: [
        {
          type: 'orderedList',
          attrs: { start: 999999 },
          content: [{ type: 'listItem', content: [{ type: 'paragraph' }] }],
        },
      ],
    });
    expect(outOfRange).not.toContain('start="999999"');
  });

  it('escapes text content rather than interpreting it as HTML', () => {
    const html = render({
      type: 'doc',
      content: [
        { type: 'paragraph', content: [{ type: 'text', text: '<img src=x onerror=alert(1)>' }] },
      ],
    });

    expect(html).not.toContain('<img');
    expect(html).toContain('&lt;img');
  });

  it('drops a node type that is not part of the render schema', () => {
    const html = render({ type: 'doc', content: [{ type: 'evilCustomNode', content: [] }] });
    expect(html).toBe('<div class="note-prose"></div>');
  });
});
