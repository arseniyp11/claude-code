import { describe, expect, it } from 'vitest';

import { authenticateUrl, DEFAULT_REDIRECT, sanitizeNext } from '@/lib/redirects';

describe('sanitizeNext', () => {
  it('allows a same-origin path', () => {
    expect(sanitizeNext('/notes/123')).toBe('/notes/123');
  });

  it('preserves search and hash', () => {
    expect(sanitizeNext('/dashboard?tab=shared#top')).toBe('/dashboard?tab=shared#top');
  });

  it('falls back to the default for non-string input', () => {
    expect(sanitizeNext(undefined)).toBe(DEFAULT_REDIRECT);
    expect(sanitizeNext(['/a', '/b'])).toBe(DEFAULT_REDIRECT);
  });

  it('falls back to the default when the value does not start with /', () => {
    expect(sanitizeNext('dashboard')).toBe(DEFAULT_REDIRECT);
    expect(sanitizeNext('')).toBe(DEFAULT_REDIRECT);
  });

  it('rejects protocol-relative URLs that escape the origin', () => {
    expect(sanitizeNext('//evil.com')).toBe(DEFAULT_REDIRECT);
    expect(sanitizeNext('/\\evil.com')).toBe(DEFAULT_REDIRECT);
  });

  it('rejects absolute URLs to another origin', () => {
    expect(sanitizeNext('https://evil.com/phish')).toBe(DEFAULT_REDIRECT);
  });

  it('rejects a same-origin path smuggled through control characters', () => {
    // Stripped control chars can turn "/<TAB>/evil.com" into "//evil.com" once
    // the URL parser resolves it — this must not slip past the origin check.
    expect(sanitizeNext('/\t/evil.com')).toBe(DEFAULT_REDIRECT);
  });

  it('rejects denied paths', () => {
    expect(sanitizeNext('/authenticate')).toBe(DEFAULT_REDIRECT);
    expect(sanitizeNext('/authenticate/sub')).toBe(DEFAULT_REDIRECT);
    expect(sanitizeNext('/api')).toBe(DEFAULT_REDIRECT);
    expect(sanitizeNext('/api/notes')).toBe(DEFAULT_REDIRECT);
  });

  it('does not treat a path merely prefixed by a denied name as denied', () => {
    expect(sanitizeNext('/authenticated-users')).toBe('/authenticated-users');
  });

  it('normalizes path traversal', () => {
    expect(sanitizeNext('/a/../../b')).toBe('/b');
  });
});

describe('authenticateUrl', () => {
  it('builds a sign-in URL with an encoded next param', () => {
    expect(authenticateUrl('/notes/123')).toBe('/authenticate?next=%2Fnotes%2F123');
  });

  it('encodes special characters in the path', () => {
    expect(authenticateUrl('/dashboard?tab=a b')).toBe(
      '/authenticate?next=%2Fdashboard%3Ftab%3Da%20b',
    );
  });
});
