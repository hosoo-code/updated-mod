import Link from "next/link";
import { ClipboardList, Eye } from "lucide-react";
import { listModeratorApplicationsAdmin } from "@/lib/repo";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { EmptyState } from "@/components/ui/empty-state";
import { formatDateTime } from "@/lib/utils";
import type { ModeratorApplicationData, ModeratorAppStatus } from "@/types";

export const dynamic = "force-dynamic";
export const metadata = { title: "Модератор анкетууд" };

const FILTERS: { value: "all" | ModeratorAppStatus; label: string }[] = [
  { value: "all", label: "Бүгд" },
  { value: "draft", label: "Ноорог" },
  { value: "submitted", label: "Илгээгдсэн" },
  { value: "editable", label: "Засах хүсэлт" },
  { value: "approved", label: "Баталгаажсан" },
  { value: "rejected", label: "Татгалзсан" },
];

export default async function ModeratorApplicationsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const filter = FILTERS.some((f) => f.value === status) ? (status as "all" | ModeratorAppStatus) : "all";
  const all = await listModeratorApplicationsAdmin();
  const apps = filter === "all" ? all : all.filter((a) => a.status === filter);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">Модератор анкетууд</h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Олон алхамт анкетүүд — зургийг харж, зөвшөөрөх/татгалзах эсвэл засуулах хүсэлт илгээнэ.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => {
          const count = f.value === "all" ? all.length : all.filter((a) => a.status === f.value).length;
          return (
            <Link
              key={f.value}
              href={`/admin/moderator-applications${f.value === "all" ? "" : `?status=${f.value}`}`}
              className={
                "rounded-full border px-3.5 py-1.5 text-xs font-medium transition-all " +
                (filter === f.value
                  ? "border-brand-500/50 bg-brand-500/10 text-brand-700 dark:text-brand-300"
                  : "border-zinc-200 text-zinc-500 hover:border-zinc-300 dark:border-white/10 dark:text-zinc-400")
              }
            >
              {f.label} <span className="opacity-60">({count})</span>
            </Link>
          );
        })}
      </div>

      <Card>
        <CardContent className="overflow-x-auto p-0">
          {apps.length === 0 ? (
            <div className="p-6">
              <EmptyState icon={<ClipboardList className="h-5 w-5" />} title="Анкет алга" />
            </div>
          ) : (
            <table className="table-base">
              <thead>
                <tr>
                  <th>Өргөдөл гаргагч</th>
                  <th>Утас</th>
                  <th>Хаагдсан</th>
                  <th>Илгээсэн</th>
                  <th>Status</th>
                  <th className="text-right">Үйлдэл</th>
                </tr>
              </thead>
              <tbody>
                {apps.map((a) => (
                  <tr key={a.id}>
                    <td>
                      <div className="flex items-center gap-3">
                        <Avatar name={a.fullName || "?"} size="sm" />
                        <div>
                          <p className="font-semibold text-zinc-900 dark:text-white">{a.fullName || "—"}</p>
                          <a
                            href={a.facebookLink || "#"}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-[#1877F2] hover:underline dark:text-[#6da3ff]"
                            onClick={(e) => (!a.facebookLink ? e.preventDefault() : undefined)}
                          >
                            Facebook
                          </a>
                        </div>
                      </div>
                    </td>
                    <td className="text-xs text-zinc-600 dark:text-zinc-300">{a.phoneNumbers.join(", ") || "—"}</td>
                    <td className="text-xs text-zinc-400">{a.vpnDetected ? "⚠️ VPN" : "—"}</td>
                    <td className="text-zinc-400">{formatDateTime(a.submittedAt ?? a.createdAt)}</td>
                    <td><StatusBadge status={a.status} /></td>
                    <td className="text-right">
                      <Link href={`/admin/moderator-applications/${a.id}`}>
                        <Button size="sm" variant="secondary">
                          <Eye className="h-3.5 w-3.5" /> Харах
                        </Button>
                      </Link>
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
