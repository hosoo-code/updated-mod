"use client";

import { useMemo, useState } from "react";
import { Lock, Search, Wifi } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { formatDateTime } from "@/lib/utils";
import type { IpHistoryEntry } from "@/types";

type RangeFilter = "today" | "7d" | "30d" | "all";

/**
 * IP History — ЗӨВХӨН admin. Нийтэд хэзээ ч харагдахгүй.
 * IP-г зөвхөн сервер талд бүртгэдэг (browser-оос уншдаггүй).
 */
export function IpsAdmin({ ips }: { ips: IpHistoryEntry[] }) {
  const [range, setRange] = useState<RangeFilter>("7d");
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const now = Date.now();
    const cutoff =
      range === "today" ? now - 86_400_000 : range === "7d" ? now - 7 * 86_400_000 : range === "30d" ? now - 30 * 86_400_000 : 0;
    return ips.filter((ip) => {
      const inRange = new Date(ip.createdAt).getTime() >= cutoff;
      const inQuery = ip.moderatorName.toLowerCase().includes(query.toLowerCase()) || ip.ip.includes(query);
      return inRange && inQuery;
    });
  }, [ips, range, query]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">IP History</h1>
        <p className="mt-1 flex items-center gap-1.5 text-sm text-zinc-500 dark:text-zinc-400">
          <Lock className="h-3.5 w-3.5" />
          Баталгаажуулалт/нэвтрэлтийн IP бүртгэл — зөвхөн admin.
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-1.5">
          {([
            ["today", "Өнөөдөр"],
            ["7d", "7 хоног"],
            ["30d", "30 хоног"],
            ["all", "Бүгд"],
          ] as [RangeFilter, string][]).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setRange(key)}
              className={
                "rounded-lg px-3.5 py-1.5 text-xs font-semibold transition " +
                (range === key
                  ? "bg-brand-500 text-white"
                  : "bg-zinc-100 text-zinc-500 hover:bg-zinc-200 dark:bg-white/8 dark:text-zinc-400 dark:hover:bg-white/12")
              }
            >
              {label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5 dark:border-white/10 dark:bg-white/[0.04] sm:w-72">
          <Search className="h-4 w-4 shrink-0 text-zinc-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Moderator эсвэл IP-ээр хайх…"
            className="w-full bg-transparent text-sm focus:outline-none dark:text-white"
          />
        </div>
      </div>

      <Card>
        <CardContent className="overflow-x-auto p-0">
          {filtered.length === 0 ? (
            <div className="p-6">
              <EmptyState icon={<Wifi className="h-5 w-5" />} title="Бүртгэл алга" description="Сонгосон хугацаанд IP бүртгэл байхгүй байна." />
            </div>
          ) : (
            <table className="table-base">
              <thead>
                <tr>
                  <th>Moderator</th>
                  <th>IP</th>
                  <th>Огноо</th>
                  <th>Event</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((ip) => (
                  <tr key={ip.id}>
                    <td>
                      <div className="flex items-center gap-3">
                        <Avatar name={ip.moderatorName} size="sm" />
                        <p className="font-semibold text-zinc-900 dark:text-white">{ip.moderatorName}</p>
                      </div>
                    </td>
                    <td>
                      <p className="font-mono text-sm text-zinc-700 dark:text-zinc-200">{ip.ip}</p>
                      <p className="text-[11px] text-zinc-400">
                        {ip.nextVerificationAt ? `Дараагийн: ${formatDateTime(ip.nextVerificationAt)}` : "—"}
                      </p>
                    </td>
                    <td className="text-zinc-400">{formatDateTime(ip.createdAt)}</td>
                    <td>
                      <Badge tone={ip.eventType === "identity" ? "brand" : ip.eventType === "login" ? "neutral" : "info"} dot>
                        {ip.eventType === "identity" ? "Identity" : ip.eventType === "login" ? "Нэвтрэлт" : "7 хоногийн"}
                      </Badge>
                    </td>
                    <td>
                      <Badge tone={ip.status === "verified" ? "brand" : ip.status === "failed" ? "danger" : "muted"} dot>
                        {ip.status === "verified" ? "Баталгаажсан" : ip.status === "failed" ? "Амжилтгүй" : "Бүртгэгдсэн"}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
