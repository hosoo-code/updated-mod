import { Lock, MapPin } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { listLocationsAdmin } from "@/lib/repo";
import { formatDateTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

/**
 * Location history — ЗӨВХӨН admin.
 * Яг координат биш, ойролцоо (coarse) байршил хадгалагддаг.
 */
export default async function AdminLocationsPage() {
  const locations = await listLocationsAdmin();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">Locations</h1>
        <p className="mt-1 flex items-center gap-1.5 text-sm text-zinc-500 dark:text-zinc-400">
          <Lock className="h-3.5 w-3.5" />
          Ойролцоо байршил (±1км) — зөвхөн эрх бүхий admin-д харагдана.
        </p>
      </div>

      <Card>
        <CardContent className="overflow-x-auto p-0">
          {locations.length === 0 ? (
            <div className="p-6">
              <EmptyState icon={<MapPin className="h-5 w-5" />} title="Байршлын бүртгэл алга" />
            </div>
          ) : (
            <table className="table-base">
              <thead>
                <tr>
                  <th>Moderator</th>
                  <th>Баталгаажуулсан огноо</th>
                  <th>Байршил</th>
                  <th>Accuracy</th>
                  <th>Төрөл</th>
                </tr>
              </thead>
              <tbody>
                {locations.map((l) => (
                  <tr key={l.id}>
                    <td>
                      <div className="flex items-center gap-3">
                        <Avatar name={l.moderatorName} size="sm" />
                        <p className="font-semibold text-zinc-900 dark:text-white">{l.moderatorName}</p>
                      </div>
                    </td>
                    <td className="text-zinc-400">{formatDateTime(l.createdAt)}</td>
                    <td>
                      <p className="font-mono text-sm text-zinc-700 dark:text-zinc-200">
                        {l.latitude?.toFixed(2)}, {l.longitude?.toFixed(2)}
                      </p>
                      <p className="text-[11px] text-zinc-400">ойролцоо ±1км</p>
                    </td>
                    <td className="text-zinc-400">{l.accuracy ? `±${Math.round(l.accuracy)}м` : "—"}</td>
                    <td>
                      <Badge tone={l.kind === "identity" ? "brand" : "info"} dot>
                        {l.kind === "identity" ? "Identity" : "7 хоногийн"}
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
