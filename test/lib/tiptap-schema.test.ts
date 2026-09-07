import { describe, expect, it } from 'vitest';

import { EMPTY_DOC } from '@/lib/tiptap';
import { MAX_CONTENT_BYTES, parseDocument } from '@/lib/tiptap-schema';

describe('parseDocument', () => {
  it('accepts the empty document', () => {
    expect(parseDocument(JSON.stringify(EMPTY_DOC))).toEqual(EMPTY_DOC);
  });

  it('accepts a document using every SPEC-listed node and mark type', () => {
    const doc = {
      type: 'doc',
      content: [
        { type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: 'Title' }] },
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'bold', marks: [{ type: 'bold' }] },
            { type: 'text', text: 'italic', marks: [{ type: 'italic' }] },
            { type: 'text', text: 'code', marks: [{ type: 'code' }] },
          ],
        },
        {
          type: 'bulletList',
          content: [
            {
              type: 'listItem',
              content: [{ type: 'paragraph', content: [{ type: 'text', text: 'item' }] }],
            },
          ],
        },
        { type: 'horizontalRule' },
        { type: 'codeBlock', content: [{ type: 'text', text: 'const x = 1;' }] },
      ],
    };

    expect(parseDocument(JSON.stringify(doc))).toEqual(doc);
  });

  it('rejects non-string input', () => {
    expect(parseDocument(undefined as unknown as string)).toBeNull();
    expect(parseDocument(null as unknown as string)).toBeNull();
  });

  it('rejects malformed JSON', () => {
    expect(parseDocument('{not json')).toBeNull();
  });

  it('rejects JSON that is not a doc-typed object', () => {
    expect(parseDocument('null')).toBeNull();
    expect(parseDocument('[]')).toBeNull();
    expect(parseDocument('{"type":"paragraph"}')).toBeNull();
    expect(parseDocument('"just a string"')).toBeNull();
  });

  it('rejects a doc with no required content', () => {
    // The schema requires at least one block; `{"type":"doc"}` violates it.
    expect(parseDocument('{"type":"doc"}')).toBeNull();
  });

  it('rejects an unknown node type', () => {
    const doc = { type: 'doc', content: [{ type: 'evilNode' }] };
    expect(parseDocument(JSON.stringify(doc))).toBeNull();
  });

  it('rejects a node whose structure violates the schema', () => {
    // `bulletList` requires `listItem` children, not a bare paragraph.
    const doc = {
      type: 'doc',
      content: [{ type: 'bulletList', content: [{ type: 'paragraph' }] }],
    };
    expect(parseDocument(JSON.stringify(doc))).toBeNull();
  });

  it('rejects a payload larger than MAX_CONTENT_BYTES without parsing it', () => {
    const hugeText = 'a'.repeat(MAX_CONTENT_BYTES + 1);
    const oversized = JSON.stringify({
      type: 'doc',
      content: [{ type: 'paragraph', content: [{ type: 'text', text: hugeText }] }],
    });

    expect(parseDocument(oversized)).toBeNull();
  });

  it('accepts a payload right at the byte limit boundary', () => {
    // Build a doc just under the limit so the byte-length check itself, not the
    // content, decides the outcome.
    const padding = 'a'.repeat(MAX_CONTENT_BYTES - 200);
    const doc = {
      type: 'doc',
      content: [{ type: 'paragraph', content: [{ type: 'text', text: padding }] }],
    };
    const serialized = JSON.stringify(doc);

    expect(Buffer.byteLength(serialized, 'utf8')).toBeLessThanOrEqual(MAX_CONTENT_BYTES);
    expect(parseDocument(serialized)).toEqual(doc);
  });
});
