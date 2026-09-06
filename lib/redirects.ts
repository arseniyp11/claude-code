/** Where users land after signing in or up when no destination was requested. */
export const DEFAULT_REDIRECT = "/dashboard";

/**
 * Narrows an untrusted `?next=` value to a same-origin path.
 *
 * Anything that could send the browser off-site — an absolute URL, a
 * protocol-relative `//host`, a backslash the URL parser normalises to `/` — is
 * discarded in favour of {@link DEFAULT_REDIRECT}.
 */
export function sanitizeNext(value: string | string[] | undefined): string {
  if (typeof value !== "string") return DEFAULT_REDIRECT;
  if (!value.startsWith("/")) return DEFAULT_REDIRECT;
  if (value.startsWith("//") || value.startsWith("/\\")) return DEFAULT_REDIRECT;
  return value;
}
