"use server";

import { isAPIError } from "better-auth/api";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";

import { auth } from "@/lib/auth";
import { sanitizeNext } from "@/lib/redirects";

export type AuthFormState = {
  /** Form-level message, shown above the fields. */
  error?: string;
  fieldErrors?: {
    email?: string;
    password?: string;
  };
  /** Echoed back so the field survives a failed submit. Never the password. */
  email?: string;
};

const emailField = z.email({ message: "Enter a valid email address." });

const signInSchema = z.object({
  email: emailField,
  password: z.string().min(1, { message: "Enter your password." }),
});

// Mirrors better-auth's own defaults (min 8, max 128) so the client-side
// `minLength` and the server both reject the same passwords.
const signUpSchema = z.object({
  email: emailField,
  password: z
    .string()
    .min(8, { message: "Use at least 8 characters." })
    .max(128, { message: "Use at most 128 characters." }),
});

/** Maps a better-auth error code to copy safe to show a visitor. */
function messageForCode(code: string): string {
  switch (code) {
    case "INVALID_EMAIL_OR_PASSWORD":
    case "CREDENTIAL_ACCOUNT_NOT_FOUND":
      return "Invalid email or password.";
    case "USER_ALREADY_EXISTS":
    case "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL":
      return "An account with that email already exists.";
    case "PASSWORD_TOO_SHORT":
      return "Use at least 8 characters.";
    case "PASSWORD_TOO_LONG":
      return "Use at most 128 characters.";
    default:
      return "Something went wrong. Please try again.";
  }
}

function toFormState(error: unknown, email: string): AuthFormState {
  if (isAPIError(error)) {
    const code = typeof error.body?.code === "string" ? error.body.code : "";
    return { error: messageForCode(code), email };
  }

  console.error("Unexpected auth failure", error);
  return { error: "Something went wrong. Please try again.", email };
}

/** Both schemas parse to the same shape; only their rules differ. */
type Credentials = { email: string; password: string };

function parse(
  schema: z.ZodType<Credentials>,
  formData: FormData,
): z.ZodSafeParseResult<Credentials> {
  return schema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
}

function fieldErrorsOf(
  error: z.ZodError<Credentials>,
): AuthFormState["fieldErrors"] {
  const { fieldErrors } = z.flattenError(error);
  return {
    email: fieldErrors.email?.[0],
    password: fieldErrors.password?.[0],
  };
}

export async function signInAction(
  _prevState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const email = String(formData.get("email") ?? "");
  const parsed = parse(signInSchema, formData);

  if (!parsed.success) {
    return { fieldErrors: fieldErrorsOf(parsed.error), email };
  }

  try {
    await auth.api.signInEmail({
      body: { email: parsed.data.email, password: parsed.data.password },
      headers: await headers(),
    });
  } catch (error) {
    return toFormState(error, email);
  }

  // Outside the try: redirect() signals by throwing, so a catch would swallow it.
  redirect(sanitizeNext(formData.get("next")?.toString()));
}

export async function signUpAction(
  _prevState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const email = String(formData.get("email") ?? "");
  const parsed = parse(signUpSchema, formData);

  if (!parsed.success) {
    return { fieldErrors: fieldErrorsOf(parsed.error), email };
  }

  try {
    await auth.api.signUpEmail({
      body: {
        email: parsed.data.email,
        password: parsed.data.password,
        // We deliberately don't ask for a display name; better-auth requires
        // one, so the email stands in for it.
        name: parsed.data.email,
      },
      headers: await headers(),
    });
  } catch (error) {
    return toFormState(error, email);
  }

  redirect(sanitizeNext(formData.get("next")?.toString()));
}

export async function signOutAction(): Promise<void> {
  await auth.api.signOut({ headers: await headers() });
  redirect("/");
}
