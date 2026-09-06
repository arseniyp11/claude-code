"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { getCurrentUser } from "@/lib/auth";
import { DEFAULT_TITLE, updateNote } from "@/lib/notes";
import { parseDocument } from "@/lib/tiptap";

export type EditNoteFormState = {
  /** Form-level message, shown above the fields. */
  error?: string;
  fieldErrors?: {
    title?: string;
    content?: string;
  };
  /** Echoed back so the field survives a failed submit. */
  title?: string;
  /** Drives the "saved" confirmation. */
  saved?: boolean;
};

// Same rules as the create action: the two forms feed the same columns, so a
// title that's acceptable on one page has to be acceptable on the other.
const schema = z.object({
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

export async function updateNoteAction(
  _prevState: EditNoteFormState,
  formData: FormData,
): Promise<EditNoteFormState> {
  const id = String(formData.get("id") ?? "");
  const title = String(formData.get("title") ?? "");

  // A page guard doesn't cover the actions that page renders — an action is a
  // separately addressable POST endpoint, so it re-checks the session itself.
  const user = await getCurrentUser();
  if (!user) redirect(`/authenticate?next=/notes/${id}`);

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

  try {
    // Scoped by user_id in SQL, so someone else's note id updates nothing and
    // comes back null — the id in the form is never trusted on its own.
    const note = await updateNote(user.id, id, parsed.data);

    if (!note) {
      return { error: "That note no longer exists.", title };
    }
  } catch (error) {
    console.error("Failed to update note", error);
    return { error: "Could not save the note. Please try again.", title };
  }

  revalidatePath("/dashboard");
  revalidatePath(`/notes/${id}`);

  return { saved: true, title: parsed.data.title };
}
