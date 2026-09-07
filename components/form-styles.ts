/**
 * Class strings shared by the app's forms, so a field on the New Note page and
 * a field on the sign-in page can't drift apart. Every color here is a semantic
 * token from globals.css — that is why no `dark:` variant appears.
 */

export const fieldClass =
  'rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus-visible:border-transparent focus-visible:ring-2 focus-visible:ring-accent';

export const primaryButtonClass =
  'rounded-md bg-foreground px-3 py-2 text-sm font-medium text-background outline-none hover:opacity-90 focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-60';

/**
 * Destructive confirm — the button that actually does the irreversible thing.
 * Same shape as `primaryButtonClass`; only the fill and the ring change, so a
 * destructive button is recognizably a button of this app before it is red.
 */
export const dangerButtonClass =
  'rounded-md bg-danger px-3 py-2 text-sm font-medium text-background outline-none hover:opacity-90 focus-visible:ring-2 focus-visible:ring-danger focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-60';

/**
 * The control that *offers* a destructive action — a Delete button that only
 * opens a confirmation. It is not itself destructive, so it stays outlined and
 * doesn't compete with the page's primary action for attention.
 */
export const dangerOutlineButtonClass =
  'rounded-md border border-danger px-3 py-2 text-sm font-medium text-danger outline-none hover:bg-danger-surface focus-visible:ring-2 focus-visible:ring-danger';

/** Quiet tertiary control: Cancel, Back — anything that walks something back. */
export const secondaryLinkClass =
  'rounded-md px-3 py-2 text-sm font-medium text-muted outline-none hover:bg-surface focus-visible:ring-2 focus-visible:ring-accent';

export const fieldErrorClass = 'text-sm text-danger';

export const hintClass = 'text-xs text-muted';

/** Form-level failure banner. Pair with `role="alert"`. */
export const alertClass = 'rounded-md bg-danger-surface px-3 py-2 text-sm text-danger';
