import type { Metadata } from "next";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { getPublicModerators } from "@/lib/repo";
import { ModeratorDirectory } from "./moderator-directory";

export const metadata: Metadata = { title: "Moderator-ууд" };
export const dynamic = "force-dynamic";

export default async function ModeratorsPage() {
  let moderators: Awaited<ReturnType<typeof getPublicModerators>> = [];
  try {
    moderators = await getPublicModerators();
  } catch (err) {
    console.error("[ModeratorsPage] Data fetch failed:", err);
  }

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 sm:py-12">
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">ARHAT MODERATOR</p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-zinc-900 dark:text-white">Moderator-ууд</h1>
            <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">Баталгаажсан, итгэмжлэгдсэн moderator-уудын жагсаалт.</p>
          </div>
        </div>
        <ModeratorDirectory moderators={moderators} />
      </main>
      <SiteFooter />
    </div>
  );
}
