/**
 * Class strings shared by the app's forms, so a field on the New Note page and
 * a field on the sign-in page can't drift apart. Every color here is a semantic
 * token from globals.css — that is why no `dark:` variant appears.
 */

export const fieldClass =
  "rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus-visible:border-transparent focus-visible:ring-2 focus-visible:ring-accent";

export const primaryButtonClass =
  "rounded-md bg-foreground px-3 py-2 text-sm font-medium text-background outline-none hover:opacity-90 focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-60";

export const fieldErrorClass = "text-sm text-danger";

export const hintClass = "text-xs text-muted";

/** Form-level failure banner. Pair with `role="alert"`. */
export const alertClass =
  "rounded-md bg-danger-surface px-3 py-2 text-sm text-danger";
