import { describe, expect, it } from 'vitest';

import { stripControlChars } from '@/lib/sanitize';

describe('stripControlChars', () => {
  it('removes C0 control characters', () => {
    expect(stripControlChars('a\x00b\x1fc')).toBe('abc');
  });

  it('removes DEL', () => {
    expect(stripControlChars('a\x7fb')).toBe('ab');
  });

  it('removes tab, CR and LF specifically', () => {
    expect(stripControlChars('/\t/evil.com')).toBe('//evil.com');
    expect(stripControlChars('java\nscript:alert(1)')).toBe('javascript:alert(1)');
    expect(stripControlChars('a\rb')).toBe('ab');
  });

  it('leaves ordinary text untouched', () => {
    expect(stripControlChars('Hello, world! 123')).toBe('Hello, world! 123');
  });

  it('handles an empty string', () => {
    expect(stripControlChars('')).toBe('');
  });
});
