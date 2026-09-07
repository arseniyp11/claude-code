import { describe, expect, it } from 'vitest';

import { DEFAULT_TITLE } from '@/lib/notes';
import { noteInputSchema } from '@/lib/note-input';
import { EMPTY_DOC } from '@/lib/tiptap';

const validContent = JSON.stringify(EMPTY_DOC);

describe('noteInputSchema', () => {
  it('accepts a normal title and content', () => {
    const result = noteInputSchema.safeParse({ title: 'My note', contentJson: validContent });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.title).toBe('My note');
      expect(result.data.contentJson).toBe(validContent);
    }
  });

  it('trims whitespace from the title', () => {
    const result = noteInputSchema.safeParse({ title: '  padded  ', contentJson: validContent });
    expect(result.success && result.data.title).toBe('padded');
  });

  it('falls back to the default title when blank', () => {
    const result = noteInputSchema.safeParse({ title: '', contentJson: validContent });
    expect(result.success && result.data.title).toBe(DEFAULT_TITLE);
  });

  it('falls back to the default title when only whitespace', () => {
    const result = noteInputSchema.safeParse({ title: '   ', contentJson: validContent });
    expect(result.success && result.data.title).toBe(DEFAULT_TITLE);
  });

  it('strips control characters from the title before validating length', () => {
    const result = noteInputSchema.safeParse({
      title: 'line1\nline2',
      contentJson: validContent,
    });
    expect(result.success && result.data.title).toBe('line1line2');
  });

  it('rejects a title over 200 characters', () => {
    const result = noteInputSchema.safeParse({ title: 'a'.repeat(201), contentJson: validContent });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe('Use at most 200 characters.');
    }
  });

  it('accepts a title at exactly 200 characters', () => {
    const result = noteInputSchema.safeParse({ title: 'a'.repeat(200), contentJson: validContent });
    expect(result.success).toBe(true);
  });

  it('rejects content that is not valid TipTap JSON', () => {
    const result = noteInputSchema.safeParse({ title: 'ok', contentJson: '{"type":"paragraph"}' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path[0] === 'contentJson')).toBe(true);
    }
  });

  it('rejects a missing contentJson field', () => {
    const result = noteInputSchema.safeParse({ title: 'ok' });
    expect(result.success).toBe(false);
  });
});
