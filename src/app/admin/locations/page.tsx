import { ExternalLink, Lock, MapPin } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { listActiveLocationsAdmin } from "@/lib/repo";
import { formatDate, formatDateTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

/**
 * Location share — ЗӨВХӨН admin.
 * Хэрэглэгч бүрийн хамгийн сүүлийн ИДЭВХТЭЙ (7 хоног болоогүй) байршил.
 * Google Maps-ийг https://www.google.com/maps?q=LAT,LNG линкээр нээнэ (API/key АШИГЛАХГҮЙ).
 */
export default async function AdminLocationsPage() {
  const locations = await listActiveLocationsAdmin();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">Locations</h1>
        <p className="mt-1 flex items-center gap-1.5 text-sm text-zinc-500 dark:text-zinc-400">
          <Lock className="h-3.5 w-3.5" />
          Хэрэглэгчийн хуваалцсан байршил (7 хоног хүчинтэй) — зөвхөн эрх бүхий admin-д харагдана.
        </p>
      </div>

      <Card>
        <CardContent className="overflow-x-auto p-0">
          {locations.length === 0 ? (
            <div className="p-6">
              <EmptyState
                icon={<MapPin className="h-5 w-5" />}
                title="Идэвхтэй хуваалцсан байршил алга"
                description="Хэрэглэгчид Dashboard-оос 'Байршил хуваалцах'-аар 7 хоногийн байршил хуваалцах боломжтой."
              />
            </div>
          ) : (
            <table className="table-base">
              <thead>
                <tr>
                  <th>Хэрэглэгч</th>
                  <th>📍 Байршил хуваалцсан</th>
                  <th>🕐 Хуваалцсан огноо</th>
                  <th>⏳ Хүчинтэй хугацаа</th>
                  <th>🗺️ Google Maps</th>
                </tr>
              </thead>
              <tbody>
                {locations.map((l) => {
                  const mapsUrl =
                    l.latitude !== null && l.longitude !== null
                      ? `https://www.google.com/maps?q=${l.latitude},${l.longitude}`
                      : null;
                  return (
                    <tr key={l.id}>
                      <td>
                        <div className="flex items-center gap-3">
                          <Avatar name={l.moderatorName} size="sm" />
                          <p className="font-semibold text-zinc-900 dark:text-white">
                            {l.moderatorName}
                          </p>
                        </div>
                      </td>
                      <td>
                        <div className="flex items-center gap-2">
                          <Badge tone="brand" dot>📍 Байршил хуваалцсан</Badge>
                        </div>
                        <p className="mt-1 font-mono text-xs text-zinc-400">
                          {l.latitude !== null && l.longitude !== null
                            ? `${l.latitude.toFixed(4)}, ${l.longitude.toFixed(4)}`
                            : "—"}
                        </p>
                      </td>
                      <td className="text-zinc-400">{formatDateTime(l.sharedAt)}</td>
                      <td>
                        <span className="text-zinc-700 dark:text-zinc-200">{formatDate(l.expiresAt)}</span>
                        <span className="ml-1.5 text-xs text-zinc-400">(+7 хоног)</span>
                      </td>
                      <td>
                        {mapsUrl ? (
                          <Button asChild variant="secondary" size="sm">
                            <a href={mapsUrl} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="h-3.5 w-3.5" /> Google Maps дээр харах
                            </a>
                          </Button>
                        ) : (
                          <span className="text-xs text-zinc-400">Координат алга</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
