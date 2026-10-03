"use client";

import Link from "next/link";
import { useState } from "react";
import { Search, Users } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { VerifiedBadge } from "@/components/ui/verified-badge";
import { EmptyState } from "@/components/ui/empty-state";
import type { getPublicModerators } from "@/lib/repo";

export function ModeratorDirectory({ moderators }: { moderators: Awaited<ReturnType<typeof getPublicModerators>> }) {
  const [query, setQuery] = useState("");
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const filtered = normalizedQuery
    ? moderators.filter((moderator) =>
        [moderator.nickname, moderator.fullName, ...moderator.groups.map((group) => group.name)]
          .filter(Boolean)
          .some((value) => value.toLocaleLowerCase().includes(normalizedQuery))
      )
    : moderators;

  return (
    <>
      <label className="flex w-full items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5 shadow-sm sm:w-72 dark:border-zinc-800 dark:bg-zinc-900/70 focus-within:border-zinc-400 focus-within:ring-2 focus-within:ring-zinc-950/10 dark:focus-within:border-zinc-500 dark:focus-within:ring-white/10">
        <Search className="h-4 w-4 shrink-0 text-zinc-400" />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          aria-label="Moderator хайх"
          placeholder="Moderator хайх…"
          className="w-full bg-transparent text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none dark:text-white"
        />
      </label>

      {filtered.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            icon={<Users className="h-6 w-6" />}
            title={normalizedQuery ? "Хайлтад тохирох moderator олдсонгүй" : "Moderator одоохондоо байхгүй байна"}
            description={normalizedQuery ? "Нэр, nickname эсвэл group-ийн нэрээр дахин хайна уу." : "Түр хүлээгээд дахин оролдоно уу."}
            action={normalizedQuery ? <button type="button" onClick={() => setQuery("")} className="text-sm font-semibold text-brand-600 hover:underline dark:text-brand-300">Хайлтыг цэвэрлэх</button> : undefined}
          />
        </div>
      ) : (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((m) => (
            <div key={m.id} className="group">
              <Card className="h-full transition-all duration-300 group-hover:-translate-y-1 group-hover:border-brand-500/40 group-hover:shadow-glow">
                <CardContent className="p-5">
                  <div className="flex items-start gap-3.5">
                    <Avatar name={m.fullName} src={m.avatarUrl} size="lg" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-zinc-900 dark:text-white">{m.nickname}</p>
                      <p className="truncate text-xs text-zinc-400">{m.fullName}</p>
                    </div>
                    {m.verificationStatus === "approved" ? <VerifiedBadge size="sm" withText={false} /> : null}
                  </div>
                  <div className="mt-4 flex items-center justify-between gap-2 text-xs text-zinc-400">
                    <span className="flex items-center gap-1.5"><Users className="h-3.5 w-3.5" />{m.groups.length} group-ийн moderator</span>
                    {m.facebookUrl ? <a href={m.facebookUrl} target="_blank" rel="noopener noreferrer" aria-label={`${m.nickname} Facebook профайл`} className="font-semibold text-[#1877F2] hover:underline">Facebook</a> : null}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {m.groups.slice(0, 2).map((g) => <span key={g.id} className="rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-[11px] font-medium text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">{g.name.length > 24 ? g.name.slice(0, 24) + "…" : g.name}</span>)}
                  </div>
                </CardContent>
              </Card>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
