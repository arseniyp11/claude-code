/**
 * Primitives for scrubbing untrusted strings.
 *
 * Deliberately dependency-free and free of `server-only`: both the redirect
 * guard and the note-input schema need `stripControlChars`, and sharing one
 * definition is the point — a second, subtly different copy is how a bypass
 * gets reintroduced.
 */

// C0 controls plus DEL. Tab, CR and LF are the ones that actually bite: the
// WHATWG URL parser strips them *before* parsing, so a value that looks like a
// safe path to a naive check can still resolve to another origin.
const CONTROL_CHARS = /[\x00-\x1F\x7F]/g;

/** Removes every C0 control character and DEL from `value`. */
export function stripControlChars(value: string): string {
  return value.replace(CONTROL_CHARS, '');
}
