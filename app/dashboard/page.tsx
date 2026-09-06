import type { Metadata } from "next";
import Link from "next/link";

import { primaryButtonClass } from "@/components/form-styles";
import { requireUser } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Dashboard",
};

export default async function DashboardPage() {
  const user = await requireUser("/dashboard");

  return (
    <div className="mx-auto w-full max-w-3xl p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="mt-2 text-sm text-muted">Signed in as {user.email}.</p>
        </div>

        <Link href="/notes/new" className={primaryButtonClass}>
          New Note
        </Link>
      </div>
    </div>
  );
}
