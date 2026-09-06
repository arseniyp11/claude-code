"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { getCurrentUser } from "@/lib/auth";
import { createNote, DEFAULT_TITLE } from "@/lib/notes";
import { parseDocument } from "@/lib/tiptap";

export type NewNoteFormState = {
  /** Form-level message, shown above the fields. */
  error?: string;
  fieldErrors?: {
    title?: string;
    content?: string;
  };
  /** Echoed back so the field survives a failed submit. */
  title?: string;
};

const schema = z.object({
  // Blank is allowed and becomes the default title, matching SPEC §3.2 — the
  // point of "New Note" is to start writing, not to name things first.
  title: z
    .string()
    .trim()
    .max(200, { message: "Use at most 200 characters." })
    .transform((value) => (value.length > 0 ? value : DEFAULT_TITLE)),

  // The editor submits this through a hidden input, so it is user-controlled.
  // Anything that isn't a TipTap document is rejected rather than stored.
  contentJson: z.string().refine((value) => parseDocument(value) !== null, {
    message: "The note content could not be read. Please try again.",
  }),
});

export async function createNoteAction(
  _prevState: NewNoteFormState,
  formData: FormData,
): Promise<NewNoteFormState> {
  const title = String(formData.get("title") ?? "");

  // A page guard doesn't cover the actions that page renders — an action is a
  // separately addressable POST endpoint, so it re-checks the session itself.
  const user = await getCurrentUser();
  if (!user) redirect("/authenticate?next=/notes/new");

  const parsed = schema.safeParse({
    title,
    contentJson: formData.get("contentJson"),
  });

  if (!parsed.success) {
    const { fieldErrors } = z.flattenError(parsed.error);
    return {
      fieldErrors: {
        title: fieldErrors.title?.[0],
        content: fieldErrors.contentJson?.[0],
      },
      title,
    };
  }

  let noteId: string;

  try {
    const note = await createNote(user.id, parsed.data);
    noteId = note.id;
  } catch (error) {
    console.error("Failed to create note", error);
    return { error: "Could not save the note. Please try again.", title };
  }

  revalidatePath("/dashboard");

  // Outside the try: redirect() signals by throwing, so a catch would swallow it.
  redirect(`/notes/${noteId}`);
}
