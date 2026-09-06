"use client";

import { useActionState } from "react";

import {
  alertClass,
  fieldClass,
  fieldErrorClass,
  hintClass,
  primaryButtonClass,
} from "@/components/form-styles";

import { signInAction, signUpAction, type AuthFormState } from "./actions";

const initialState: AuthFormState = {};

export type AuthMode = "signin" | "signup";

export function AuthForm({ mode, next }: { mode: AuthMode; next: string }) {
  const isSignUp = mode === "signup";
  const [state, formAction, pending] = useActionState(
    isSignUp ? signUpAction : signInAction,
    initialState,
  );

  const emailError = state.fieldErrors?.email;
  const passwordError = state.fieldErrors?.password;

  const labels = isSignUp
    ? { idle: "Create account", busy: "Creating account…" }
    : { idle: "Sign in", busy: "Signing in…" };

  // Point the password field at whichever hint is actually rendered below it.
  const passwordHint = passwordError
    ? "password-error"
    : isSignUp
      ? "password-hint"
      : undefined;

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {state.error && (
        <p role="alert" className={alertClass}>
          {state.error}
        </p>
      )}

      <div className="flex flex-col gap-1.5">
        <label htmlFor="email" className="text-sm font-medium">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          autoFocus
          defaultValue={state.email}
          aria-describedby={emailError ? "email-error" : undefined}
          className={fieldClass}
        />
        {emailError && (
          <p id="email-error" className={fieldErrorClass}>
            {emailError}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="password" className="text-sm font-medium">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          minLength={isSignUp ? 8 : undefined}
          autoComplete={isSignUp ? "new-password" : "current-password"}
          aria-describedby={passwordHint}
          className={fieldClass}
        />
        {passwordError ? (
          <p id="password-error" className={fieldErrorClass}>
            {passwordError}
          </p>
        ) : (
          isSignUp && (
            <p id="password-hint" className={hintClass}>
              At least 8 characters.
            </p>
          )
        )}
      </div>

      <input type="hidden" name="next" value={next} />

      <button type="submit" disabled={pending} className={primaryButtonClass}>
        {pending ? labels.busy : labels.idle}
      </button>
    </form>
  );
}
