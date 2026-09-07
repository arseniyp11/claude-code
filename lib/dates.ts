/**
 * Formatting for the timestamps SQLite writes.
 *
 * `created_at` / `updated_at` default to `datetime('now')`, which yields
 * `"2026-09-06 12:34:56"` — UTC, but in a shape JavaScript does not recognise as
 * ISO 8601.
 */

/**
 * Turns a SQLite `datetime('now')` string into a real instant.
 *
 * The normalisation is not cosmetic. `new Date("2026-09-06 12:34:56")` falls
 * back to an implementation-defined path that V8 reads as *local* time, so the
 * same row would render an hour or two off depending on the server's TZ.
 * Inserting the `T` and the `Z` makes it the UTC instant SQLite actually stored.
 */
export function sqliteUtcToDate(value: string): Date | null {
  if (typeof value !== 'string' || !value) return null;

  const date = new Date(`${value.replace(' ', 'T')}Z`);

  return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * Both the locale and the time zone are pinned, so the output is a pure function
 * of the stored string: it does not shift with the server's `LANG` or `TZ`, and
 * a redeploy onto a differently configured host cannot silently change what
 * every user sees. Callers pair it with a "UTC" suffix so the displayed value
 * stays honest about which zone it is in.
 */
const formatter = new Intl.DateTimeFormat('en-US', {
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone: 'UTC',
});

/** Display form of a stored timestamp. Empty string when it cannot be parsed. */
export function formatNoteDate(value: string): string {
  const date = sqliteUtcToDate(value);

  return date ? formatter.format(date) : '';
}
