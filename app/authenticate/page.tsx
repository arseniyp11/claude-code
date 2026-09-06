import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth";
import { sanitizeNext } from "@/lib/redirects";

import { AuthForm, type AuthMode } from "./auth-form";

export const metadata: Metadata = {
  title: "Sign in",
};

const copy = {
  signin: {
    heading: "Sign in",
    prompt: "New here?",
    linkLabel: "Create an account",
    otherMode: "signup",
  },
  signup: {
    heading: "Create an account",
    prompt: "Already have an account?",
    linkLabel: "Sign in",
    otherMode: "signin",
  },
} as const;

export default async function AuthenticatePage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string; next?: string }>;
}) {
  const { mode: rawMode, next: rawNext } = await searchParams;
  const next = sanitizeNext(rawNext);
  const mode: AuthMode = rawMode === "signup" ? "signup" : "signin";

  // Nobody signed in should ever see this page.
  if (await getCurrentUser()) redirect(next);

  const { heading, prompt, linkLabel, otherMode } = copy[mode];
  const toggleParams = new URLSearchParams({ next });
  if (otherMode === "signup") toggleParams.set("mode", "signup");

  return (
    <div className="flex justify-center px-6 py-16">
      <section className="w-full max-w-sm">
        <h1 className="mb-6 text-2xl font-semibold tracking-tight">{heading}</h1>

        {/* Remount on mode change so the previous mode's errors don't linger. */}
        <AuthForm key={mode} mode={mode} next={next} />

        <p className="mt-6 text-sm text-muted">
          {prompt}{" "}
          <Link
            href={`/authenticate?${toggleParams}`}
            className="rounded-sm font-medium text-foreground underline underline-offset-4 outline-none hover:no-underline focus-visible:ring-2 focus-visible:ring-accent"
          >
            {linkLabel}
          </Link>
        </p>
      </section>
    </div>
  );
}
