import { describe, expect, it } from 'vitest';

import { formatNoteDate, sqliteUtcToDate } from '@/lib/dates';

describe('sqliteUtcToDate', () => {
  it('parses a sqlite datetime string as UTC', () => {
    const date = sqliteUtcToDate('2026-09-06 12:34:56');
    expect(date?.toISOString()).toBe('2026-09-06T12:34:56.000Z');
  });

  it('returns null for non-string input', () => {
    expect(sqliteUtcToDate(undefined as unknown as string)).toBeNull();
    expect(sqliteUtcToDate(null as unknown as string)).toBeNull();
  });

  it('returns null for an empty string', () => {
    expect(sqliteUtcToDate('')).toBeNull();
  });

  it('returns null for unparseable input', () => {
    expect(sqliteUtcToDate('not a date')).toBeNull();
  });
});

describe('formatNoteDate', () => {
  it('formats a valid timestamp in UTC, medium date / short time', () => {
    expect(formatNoteDate('2026-09-06 12:34:56')).toBe('Sep 6, 2026 at 12:34 PM');
  });

  it('returns an empty string for an unparseable timestamp', () => {
    expect(formatNoteDate('garbage')).toBe('');
  });
});
