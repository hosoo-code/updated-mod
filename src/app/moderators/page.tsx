import type { Metadata } from "next";
import Link from "next/link";
import { Search, Users } from "lucide-react";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { VerifiedBadge } from "@/components/ui/verified-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { getPublicModerators } from "@/lib/repo";

export const metadata: Metadata = { title: "Moderator-ууд" };
export const dynamic = "force-dynamic";

export default async function ModeratorsPage() {
  const moderators = await getPublicModerators();

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-12 sm:px-6">
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-600 dark:text-brand-300">
              ARHAT MODERATOR
            </p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-zinc-900 dark:text-white">
              Moderator-ууд
            </h1>
            <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
              Баталгаажсан, итгэмжлэгдсэн moderator-уудын жагсаалт.
            </p>
          </div>
          <div className="flex w-full items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5 sm:w-72 dark:border-white/10 dark:bg-white/[0.04]">
            <Search className="h-4 w-4 shrink-0 text-zinc-400" />
            <input
              aria-label="Moderator хайх"
              placeholder="Moderator хайх…"
              className="w-full bg-transparent text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none dark:text-white"
            />
          </div>
        </div>

        {moderators.length === 0 ? (
          <div className="mt-8">
            <EmptyState
              icon={<Users className="h-6 w-6" />}
              title="Moderator одоохондоо байхгүй байна"
              description="Түр хүлээгээд дахин оролдоно уу."
            />
          </div>
        ) : (
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {moderators.map((m) => (
              <Link key={m.id} href={`/moderators/${m.id}`} className="group">
                <Card className="h-full transition-all duration-300 group-hover:-translate-y-1 group-hover:border-brand-500/40 group-hover:shadow-glow">
                  <CardContent className="p-5">
                    <div className="flex items-start gap-3.5">
                      <Avatar name={m.fullName} src={m.avatarUrl} size="lg" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold text-zinc-900 dark:text-white">{m.nickname}</p>
                        <p className="truncate text-xs text-zinc-400">{m.fullName}</p>
                      </div>
                      {m.verificationStatus === "approved" ? (
                        <VerifiedBadge size="sm" withText={false} />
                      ) : null}
                    </div>
                    <div className="mt-4 flex items-center gap-1.5 text-xs text-zinc-400">
                      <Users className="h-3.5 w-3.5" />
                      {m.groups.length} group-ийн moderator
                    </div>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {m.groups.slice(0, 2).map((g) => (
                        <span
                          key={g.id}
                          className="rounded-full bg-zinc-100 px-2.5 py-1 text-[11px] font-medium text-zinc-500 dark:bg-white/8 dark:text-zinc-400"
                        >
                          {g.name.length > 24 ? g.name.slice(0, 24) + "…" : g.name}
                        </span>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
