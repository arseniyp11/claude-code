import { stripControlChars } from './sanitize';

/** Where users land after signing in or up when no destination was requested. */
export const DEFAULT_REDIRECT = '/dashboard';

/**
 * Origin used only to re-parse a candidate path. Never sent anywhere; the value
 * matters solely as something to compare `url.origin` against.
 */
const PROBE_ORIGIN = 'http://localhost';

/**
 * Paths that are never a valid post-sign-in destination.
 *
 * `/authenticate` would bounce a signed-in visitor straight back to the page
 * that redirected them, forever; `/api/*` is not a page at all.
 */
const DENIED = ['/authenticate', '/api'];

/**
 * Narrows an untrusted `?next=` value to a same-origin path.
 *
 * Order matters here. Control characters are stripped *first*, because the
 * WHATWG URL parser removes ASCII tab, CR and LF before it parses — so
 * `/<TAB>/evil.com` arrives looking like a rooted path but the browser resolves
 * it as the protocol-relative `//evil.com`. Checking the raw value would
 * inspect a different string than the one the browser ultimately follows.
 *
 * After stripping, the value is re-parsed against a throwaway origin: anything
 * that escapes it — an absolute URL, `//host`, a backslash the parser
 * normalises to `/` — changes `url.origin` and is rejected. Re-parsing also
 * normalises traversal (`/a/../../b`) so the deny-list can't be stepped around.
 */
export function sanitizeNext(value: string | string[] | undefined): string {
  if (typeof value !== 'string') return DEFAULT_REDIRECT;

  const cleaned = stripControlChars(value);
  if (!cleaned.startsWith('/')) return DEFAULT_REDIRECT;

  let url: URL;
  try {
    url = new URL(cleaned, PROBE_ORIGIN);
  } catch {
    return DEFAULT_REDIRECT;
  }

  // Catches "//evil.com" and "/\evil.com", both of which the parser resolves to
  // another host despite starting with a slash.
  if (url.origin !== PROBE_ORIGIN) return DEFAULT_REDIRECT;

  if (DENIED.some((path) => url.pathname === path || url.pathname.startsWith(`${path}/`))) {
    return DEFAULT_REDIRECT;
  }

  return `${url.pathname}${url.search}${url.hash}`;
}

/**
 * Builds the sign-in URL that sends the visitor back to `path` afterwards.
 *
 * Both the page guard and the note actions need this, and `path` can contain
 * caller-supplied data (a note id straight off a form), so the encoding lives
 * in one place rather than being re-derived — and re-forgotten — per call site.
 */
export function authenticateUrl(path: string): string {
  return `/authenticate?next=${encodeURIComponent(path)}`;
}
