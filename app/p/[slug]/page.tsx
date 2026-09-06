import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Public note",
};

export default async function PublicNotePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  return (
    <div className="flex min-h-screen items-center justify-center">
      <h1 className="text-3xl font-semibold">Public note — {slug}</h1>
    </div>
  );
}
