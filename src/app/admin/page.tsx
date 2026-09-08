import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  FileText,
  FolderKanban,
  ListChecks,
  ShieldX,
  Users,
  Wifi,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { StatusBadge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { EmptyState } from "@/components/ui/empty-state";
import { getAdminStats } from "@/lib/repo";
import { formatDateTime, formatShortDate } from "@/lib/utils";
import type { AdminStats } from "@/types";

export const dynamic = "force-dynamic";

const EMPTY_STATS: AdminStats = {
  totalModerators: 0,
  verifiedModerators: 0,
  pendingVerification: 0,
  rejectedVerification: 0,
  totalGroups: 0,
  totalMembers: 0,
  verificationActivity: [],
  weeklyOverview: [],
  recentApplications: [],
};

export default async function AdminOverviewPage() {
  // Статистик ачааллахад алдаа гарвал (env алга, сүлжээ) — dashboard-ийг
  // blank болгохгүй, хоосон stats-аар рендэр хийнэ.
  let stats = EMPTY_STATS;
  try {
    stats = await getAdminStats();
  } catch (e) {
    console.error("[admin] Статистик ачааллахад алдаа гарлаа:", e);
  }
  const maxActivity = Math.max(1, ...stats.verificationActivity.map((a) => a.count));

  return (
    <div className="space-y-6 animate-fade-up">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">Dashboard</h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          ARHAT MODERATOR платформын ерөнхий мэдээлэл.
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
        <StatCard label="Нийт moderator" value={stats.totalModerators} icon={<Users className="h-[18px] w-[18px]" />} tone="neutral" />
        <StatCard label="Баталгаажсан" value={stats.verifiedModerators} icon={<BadgeCheck className="h-[18px] w-[18px]" />} tone="brand" />
        <StatCard label="Хүлээгдэж буй" value={stats.pendingVerification} icon={<ListChecks className="h-[18px] w-[18px]" />} tone="gold" />
        <StatCard label="Татгалзсан" value={stats.rejectedVerification} icon={<ShieldX className="h-[18px] w-[18px]" />} tone="danger" />
        <StatCard label="Нийт group" value={stats.totalGroups} icon={<FolderKanban className="h-[18px] w-[18px]" />} tone="info" />
        <StatCard label="Нийт member" value={stats.totalMembers} format="members" icon={<Users className="h-[18px] w-[18px]" />} tone="brand" />
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        {/* Activity chart */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Баталгаажуулалтын идэвхжил</CardTitle>
            <CardDescription>Сүүлийн 7 хоногийн verification хүсэлтүүд</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex h-44 items-end gap-3">
              {stats.verificationActivity.map((a) => {
                const pct = (a.count / maxActivity) * 100;
                return (
                  <div key={a.date} className="group flex flex-1 flex-col items-center gap-2">
                    <span className="text-xs font-semibold tabular-nums text-zinc-500 dark:text-zinc-400 opacity-0 transition group-hover:opacity-100">
                      {a.count}
                    </span>
                    <div
                      className="w-full max-w-12 rounded-t-lg bg-gradient-to-t from-brand-600 to-brand-400 transition-all duration-500 group-hover:from-brand-500 group-hover:to-brand-300"
                      style={{ height: `${Math.max(8, pct)}%` }}
                    />
                    <span className="text-[10px] text-zinc-400">{formatShortDate(a.date)}</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Weekly overview */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between">
            <div>
              <CardTitle>7 хоногийн шалгалт</CardTitle>
              <CardDescription>Сүүлийн баталгаажуулалтууд</CardDescription>
            </div>
            <Link href="/admin/ips" className="text-xs font-semibold text-brand-600 hover:underline dark:text-brand-300">
              Бүгд →
            </Link>
          </CardHeader>
          <CardContent className="space-y-3">
            {stats.weeklyOverview.length === 0 ? (
              <EmptyState icon={<Wifi className="h-5 w-5" />} title="Бүртгэл алга" />
            ) : (
              stats.weeklyOverview.slice(0, 6).map((w) => (
                <div key={w.id} className="flex items-center gap-3">
                  <Avatar name={w.moderatorName} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-zinc-900 dark:text-white">{w.moderatorName}</p>
                    <p className="text-[11px] text-zinc-400">{formatDateTime(w.createdAt)}</p>
                  </div>
                  <span
                    className={
                      "flex items-center gap-1 text-[11px] font-semibold " +
                      (w.status === "verified" ? "text-brand-600 dark:text-brand-300" : "text-rose-500")
                    }
                  >
                    <Wifi className="h-3 w-3" />
                    {w.status === "verified" ? "Баталгаажсан" : "Амжилтгүй"}
                  </span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent applications */}
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-brand-500" /> Сүүлийн өргөдлүүд
            </CardTitle>
            <CardDescription>Шинээр ирсэн moderator болох хүсэлтүүд</CardDescription>
          </div>
          <Link href="/admin/applications" className="flex items-center gap-1 text-xs font-semibold text-brand-600 hover:underline dark:text-brand-300">
            Бүгдийг харах <ArrowRight className="h-3 w-3" />
          </Link>
        </CardHeader>
        <CardContent>
          {stats.recentApplications.length === 0 ? (
            <EmptyState icon={<FileText className="h-5 w-5" />} title="Өргөдөл алга" />
          ) : (
            <div className="space-y-3">
              {stats.recentApplications.map((app) => (
                <div key={app.id} className="flex items-center gap-3">
                  <Avatar name={app.fullName} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-zinc-900 dark:text-white">
                      {app.fullName} <span className="text-zinc-400">({app.nickname})</span>
                    </p>
                    <p className="truncate text-[11px] text-zinc-400">
                      {app.email} · {app.groupsText ?? "Group заагаагүй"}
                    </p>
                  </div>
                  <StatusBadge status={app.status} />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
