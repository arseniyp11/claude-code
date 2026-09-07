// Logs raw error objects; keep it off the client.
import 'server-only';

/**
 * Error reporting that stays helpful without leaking anything (SPEC §4).
 *
 * The rule this enforces: the real error — message, stack, SQL, the shape of
 * the schema, whether a row existed — goes to the server log and nowhere else.
 * What reaches the browser is a generic sentence plus a short reference id, so
 * a user can quote something actionable in a bug report and an operator can
 * find the matching log line, while an attacker learns nothing about internals.
 */

/**
 * Logs `error` against a freshly generated reference id and returns that id.
 *
 * Callers pair the returned id with their own user-facing copy; this function
 * deliberately does not produce the message itself, because the right wording
 * depends on what the user was trying to do.
 */
export function reportError(context: string, error: unknown): string {
  const reference = crypto.randomUUID().slice(0, 8);

  console.error(`[${reference}] ${context}`, error);

  return reference;
}

/** Appends a reference id to user-facing copy. */
export function withReference(message: string, reference: string): string {
  return `${message} (reference: ${reference})`;
}
