import { describe, expect, it } from 'vitest';

import { EMPTY_DOC, isEmptyDocument, type TiptapDoc } from '@/lib/tiptap';

describe('EMPTY_DOC', () => {
  it('is itself considered empty', () => {
    // EMPTY_DOC is deliberately typed as a mutable JSONContent, not a literal
    // TiptapDoc (see lib/tiptap.ts), so it needs the same cast any real caller
    // of isEmptyDocument would apply to it.
    expect(isEmptyDocument(EMPTY_DOC as TiptapDoc)).toBe(true);
  });
});

describe('isEmptyDocument', () => {
  it('treats a doc with no content as empty', () => {
    expect(isEmptyDocument({ type: 'doc' })).toBe(true);
    expect(isEmptyDocument({ type: 'doc', content: [] })).toBe(true);
  });

  it('treats a single contentless paragraph as empty', () => {
    expect(isEmptyDocument({ type: 'doc', content: [{ type: 'paragraph' }] })).toBe(true);
  });

  it('treats multiple contentless paragraphs as empty', () => {
    expect(
      isEmptyDocument({
        type: 'doc',
        content: [{ type: 'paragraph' }, { type: 'paragraph' }],
      }),
    ).toBe(true);
  });

  it('treats a paragraph with text content as non-empty', () => {
    expect(
      isEmptyDocument({
        type: 'doc',
        content: [{ type: 'paragraph', content: [{ type: 'text', text: 'hi' }] }],
      }),
    ).toBe(false);
  });

  it('treats a non-paragraph block as non-empty', () => {
    expect(
      isEmptyDocument({
        type: 'doc',
        content: [{ type: 'horizontalRule' }],
      }),
    ).toBe(false);
  });

  it('treats non-array content as empty', () => {
    expect(isEmptyDocument({ type: 'doc', content: 'nonsense' as unknown as unknown[] })).toBe(
      true,
    );
  });
});
