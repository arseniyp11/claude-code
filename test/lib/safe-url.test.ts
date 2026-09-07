import { describe, expect, it } from 'vitest';

import { safeHref } from '@/lib/safe-url';

describe('safeHref', () => {
  it('accepts http, https and mailto URLs', () => {
    expect(safeHref('http://example.com')).toBe('http://example.com/');
    expect(safeHref('https://example.com/path?q=1')).toBe('https://example.com/path?q=1');
    expect(safeHref('mailto:a@example.com')).toBe('mailto:a@example.com');
  });

  it('rejects javascript: URLs', () => {
    expect(safeHref('javascript:alert(1)')).toBeNull();
  });

  it('rejects javascript: URLs smuggled via control characters', () => {
    // The WHATWG URL parser strips tab/CR/LF before reading the scheme, so a
    // naive check on the raw string would see something other than "javascript:".
    expect(safeHref('java\nscript:alert(1)')).toBeNull();
    expect(safeHref('java\tscript:alert(1)')).toBeNull();
  });

  it('rejects data: and other unlisted protocols', () => {
    expect(safeHref('data:text/html,<script>alert(1)</script>')).toBeNull();
    expect(safeHref('vbscript:msgbox(1)')).toBeNull();
    expect(safeHref('blob:https://example.com/uuid')).toBeNull();
  });

  it('rejects relative URLs', () => {
    expect(safeHref('/relative/path')).toBeNull();
    expect(safeHref('evil.com')).toBeNull();
  });

  it('rejects non-string and empty input', () => {
    expect(safeHref(undefined)).toBeNull();
    expect(safeHref(null)).toBeNull();
    expect(safeHref(42)).toBeNull();
    expect(safeHref('')).toBeNull();
    expect(safeHref('   ')).toBeNull();
  });

  it('trims surrounding whitespace', () => {
    expect(safeHref('  https://example.com  ')).toBe('https://example.com/');
  });
});
