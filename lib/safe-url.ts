import { stripControlChars } from './sanitize';

/**
 * Protocols a note's link may point at.
 *
 * `javascript:` and `data:` are the ones that matter: both turn an `href` into
 * script execution in the reader's origin. Everything outside this set is
 * rejected rather than blocklisted, so a protocol nobody thought of (`vbscript:`,
 * `blob:`) is denied by default.
 */
const ALLOWED_PROTOCOLS = new Set(['http:', 'https:', 'mailto:']);

/**
 * Validates a link target taken from stored note content.
 *
 * This is load-bearing, not belt-and-braces. `parseDocument` checks a document
 * against the ProseMirror schema, but a schema only constrains node and mark
 * *types* and the *names* of their attributes — prosemirror-model's `checkAttrs`
 * never inspects an attribute's value unless the extension supplies a
 * `validate`, and TipTap's extensions do not. StarterKit v3 registers a `link`
 * mark, so `{"type":"link","attrs":{"href":"javascript:alert(1)"}}` is a
 * perfectly valid document as far as every other layer in this app is
 * concerned. `content_json` arrives from a hidden form field, which is to say
 * from the client, so the renderer is the last place this can be caught.
 *
 * Returns null for anything unusable; the caller renders the text without a
 * link rather than emitting an `<a>` it could not vouch for.
 */
export function safeHref(value: unknown): string | null {
  if (typeof value !== 'string') return null;

  // Control characters come off first, and the order is the whole point: the
  // WHATWG URL parser itself strips tab, CR and LF before it looks at the
  // scheme, so `java\nscript:alert(1)` parses as `javascript:`. Checking the
  // protocol of a string that still contains them would be checking a different
  // URL than the browser will.
  const cleaned = stripControlChars(value).trim();
  if (!cleaned) return null;

  let url: URL;

  try {
    // No base: a relative URL throws and is rejected. The editor only ever
    // produces absolute links, and resolving one against the current page would
    // mean guessing which page that is.
    url = new URL(cleaned);
  } catch {
    return null;
  }

  if (!ALLOWED_PROTOCOLS.has(url.protocol)) return null;

  // The serialized URL, not the input — what gets rendered is then exactly what
  // was validated, with no room for the two to differ.
  return url.href;
}
