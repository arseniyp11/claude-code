import type { JSONContent } from "@tiptap/react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { requireUser } from "@/lib/auth";
import { getNoteById } from "@/lib/notes";
import { EMPTY_DOC, parseDocument } from "@/lib/tiptap";

import { EditNoteForm } from "./edit-note-form";

type NotePageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({
  params,
}: NotePageProps): Promise<Metadata> {
  const { id } = await params;
  const user = await requireUser(`/notes/${id}`);
  const note = await getNoteById(user.id, id);

  return { title: note ? note.title : "Note not found" };
}

export default async function NotePage({ params }: NotePageProps) {
  const { id } = await params;
  const user = await requireUser(`/notes/${id}`);

  // Scoped by user_id in SQL, so another user's note is indistinguishable from
  // one that doesn't exist — 404, never a permission error.
  const note = await getNoteById(user.id, id);
  if (!note) notFound();

  // A row whose JSON no longer parses opens as an empty editor instead of
  // throwing, so a bad write can still be recovered by hand.
  //
  // `parseDocument` validates the top-level node and deliberately leaves the
  // children as `unknown` — it's a gate against arbitrary JSON, not a schema.
  // TipTap validates the rest against its own schema on load, discarding nodes
  // no registered extension claims, so handing it the document is safe.
  const content = (parseDocument(note.contentJson) ?? EMPTY_DOC) as JSONContent;

  return (
    <div className="mx-auto w-full max-w-3xl p-6">
      <h1 className="text-2xl font-semibold tracking-tight">Edit note</h1>
      <p className="mt-2 text-sm text-muted">
        Changes are saved when you choose Save changes.
      </p>

      <div className="mt-8">
        <EditNoteForm
          note={{ id: note.id, title: note.title, content }}
        />
      </div>
    </div>
  );
}
