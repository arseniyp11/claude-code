// Turns a stray client-component import of this module into a build error:
// `auth` closes over the SQLite handle and BETTER_AUTH_SECRET.
import "server-only";

import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";

import { getDb } from "./db";

/**
 * better-auth instance (SPEC §3.1, §7.1).
 *
 * Schema for the `user`, `session`, `account` and `verification` tables is
 * generated from this config — after changing it, re-run:
 *
 *   bunx @better-auth/cli migrate
 */
export const auth = betterAuth({
  // Reuse the singleton from lib/db.ts. Opening a second Database here would
  // put two writers on the same WAL file.
  database: getDb(),

  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL ?? "http://localhost:3000",

  emailAndPassword: {
    enabled: true,
  },

  session: {
    // Signs a short-lived copy of the session into the cookie so the common
    // case — a guard on every protected page — reads no rows at all. The cost
    // is that a session revoked elsewhere stays usable for up to `maxAge`;
    // signing out is unaffected, since it clears the cookie outright.
    cookieCache: { enabled: true, maxAge: 60 },
  },

  // SPEC §5.1 asks for `account: { identityStrategy: "provider-id" }`, but that
  // option does not exist in better-auth 1.7.2 — it appears in neither the types
  // nor the runtime, so setting it only breaks the typecheck. This version
  // already writes the deterministic issuer the spec wants
  // (`local:credential`, or `local:oauth:<providerId>`) with no configuration;
  // see @better-auth/core/dist/db/schema/account.mjs. Revisit if better-auth is
  // upgraded to a version that introduces the option.

  // nextCookies() must stay last so it can persist cookies set during server actions.
  plugins: [nextCookies()],
});

export type Session = typeof auth.$Infer.Session;
export type User = Session["user"];

/**
 * Returns the current session, or null when the request is unauthenticated.
 *
 * Memoized for the lifetime of one request, so the root layout, the page and
 * any server action it renders share a single session lookup instead of each
 * paying its own round-trip to SQLite.
 */
export const getSession = cache(async (): Promise<Session | null> => {
  return auth.api.getSession({ headers: await headers() });
});

/** Returns the signed-in user, or null when the request is unauthenticated. */
export async function getCurrentUser(): Promise<User | null> {
  const session = await getSession();
  return session?.user ?? null;
}

/**
 * Page guard (SPEC §11). Returns the signed-in user, or sends the visitor to
 * /authenticate with `next` set so they come back to `path`.
 *
 * Guards are per-route by design: call this at the top of each protected page
 * rather than in a layout, which React may keep mounted across a navigation.
 *
 * A page guard does NOT cover the server actions that page renders — actions
 * are separately addressable POST endpoints, so each one must re-check the
 * session itself and scope its query by `user_id`.
 *
 * Signals by throwing (`redirect()`), so never call this inside a `try` whose
 * `catch` swallows the error.
 */
export async function requireUser(path: string): Promise<User> {
  const user = await getCurrentUser();
  if (!user) redirect(`/authenticate?next=${encodeURIComponent(path)}`);
  return user;
}

/**
 * Route Handler guard (SPEC §7.1). Returns the signed-in user, or a 401 to
 * return verbatim — redirecting a `fetch` to a sign-in page would hand the
 * caller an HTML body where it expects JSON.
 *
 *   const user = await requireApiUser();
 *   if (user instanceof Response) return user;
 */
export async function requireApiUser(): Promise<User | Response> {
  const user = await getCurrentUser();
  return user ?? Response.json({ error: "Unauthorized" }, { status: 401 });
}
