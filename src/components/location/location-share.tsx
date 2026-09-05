"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, MapPin, RefreshCw, Watch } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import { formatDate, daysUntil } from "@/lib/utils";

interface ActiveLocation {
  id: string;
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  sharedAt: string;
  expiresAt: string;
}

/**
 * Байршил хуваалцах — ЗӨВХӨН browser Geolocation API ашиглана.
 * Google Maps API / SDK / API key АШИГЛАХГҮЙ.
 * - 'Байршил хуваалцах' товч → GPS permission → lat/lng → /api/location/share
 * - expires_at = shared_at + 7 хоног; хугацаа өнгөрвөл дахин хуваалцах шаардлагатай.
 */
export function LocationShare() {
  const router = useRouter();
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState<ActiveLocation | null>(null);
  const [checking, setChecking] = useState(true);

  const loadActive = useCallback(async () => {
    try {
      const res = await fetch("/api/location/share", { cache: "no-store" });
      const json = await res.json();
      if (json.ok) setActive(json.data.active ?? null);
    } catch {
      // read нь амжилтгүй бол шинэ share-г л хориглож болохгүй — зөвхөн state хоосон
      setActive(null);
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    loadActive();
  }, [loadActive]);

  const handleShare = useCallback(async () => {
    setLoading(true);
    try {
      if (!("geolocation" in navigator)) {
        toast.error("Энэ төхөөрөмж байршил дэмжихгүй байна.");
        return;
      }
      let position: GeolocationPosition;
      try {
        position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: false,
            timeout: 10_000,
            maximumAge: 300_000,
          });
        });
      } catch (e) {
        if (e instanceof GeolocationPositionError) {
          if (e.code === e.PERMISSION_DENIED) {
            toast.error(
              "Байршил ашиглах зөвшөөрөл татгалзсан. Тохиргооноос байршилд зөвшөөрч, дахин оролдоно уу."
            );
            return;
          }
          if (e.code === e.TIMEOUT) {
            toast.error("Байршил тодорхойлоход хугацаа хэтэрлээ. Дахин оролдоно уу.");
            return;
          }
          toast.error("Байршил тодорхойлох боломжгүй байна. Дахин оролдоно уу.");
          return;
        }
        toast.error("Байршил авахад алдаа гарлаа. Дахин оролдоно уу.");
        return;
      }

      const res = await fetch("/api/location/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        }),
      });
      const json = await res.json();
      if (!json.ok) {
        toast.error(json.error ?? "Байршил хадгалахад алдаа гарлаа. Дахин оролдоно уу.");
        return;
      }
      setActive({
        id: json.data.id,
        latitude: json.data.latitude,
        longitude: json.data.longitude,
        accuracy: json.data.accuracy,
        sharedAt: json.data.sharedAt,
        expiresAt: json.data.expiresAt,
      });
      toast.success("Байршил амжилттай хуваалцлаа.");
      router.refresh();
    } catch {
      toast.error("Сүлжээний алдаа гарлаа. Дахин оролдоно уу.");
    } finally {
      setLoading(false);
    }
  }, [router, toast]);

  const expired = active ? new Date(active.expiresAt).getTime() <= Date.now() : true;
  const daysLeft = active && !expired ? daysUntil(active.expiresAt) : 0;

  if (checking) {
    return (
      <div className="flex items-center gap-2 py-6 text-sm text-zinc-500 dark:text-zinc-400">
        <Loader2 className="h-4 w-4 animate-spin" /> Байршлын төлөв шалгаж байна…
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {active && !expired ? (
        <div className="rounded-xl border border-brand-500/25 bg-brand-500/5 p-4 space-y-3">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-brand-500" />
              <span className="font-medium text-zinc-900 dark:text-white">📍 Байршил хуваалцсан</span>
            </div>
            <Badge tone="brand" dot>Идэвхтэй</Badge>
          </div>
          <div className="grid gap-2 text-sm sm:grid-cols-2">
            <div className="text-zinc-500 dark:text-zinc-400">
              🕐 Хуваалцсан огноо:
              <span className="ml-1 font-medium text-zinc-800 dark:text-zinc-100">
                {formatDate(active.sharedAt)}
              </span>
            </div>
            <div className="text-zinc-500 dark:text-zinc-400">
              ⏳ Хүчинтэй хугацаа:
              <span className="ml-1 font-medium text-zinc-800 dark:text-zinc-100">
                {formatDate(active.expiresAt)}
                <span className="ml-1 text-brand-600 dark:text-brand-300">
                  ({daysLeft} хоног)
                </span>
              </span>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={handleShare} loading={loading}>
            <RefreshCw className="h-4 w-4" /> Дахин хуваалцах
          </Button>
        </div>
      ) : (
        <div className="rounded-xl border border-zinc-200 dark:border-white/10 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Watch className="h-4 w-4 text-zinc-400" />
            <span className="text-sm font-medium text-zinc-700 dark:text-zinc-200">
              {active ? "Байршлын хугацаа дууссан" : "Байршил хуваалцаагүй байна"}
            </span>
          </div>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Байршил нь 7 хоногийн турш хүчинтэй. Дараа нь дахин хуваалцах шаардлагатай.
          </p>
          <Button onClick={handleShare} loading={loading}>
            <MapPin className="h-4 w-4" /> 📍 Байршил хуваалцах
          </Button>
        </div>
      )}
    </div>
  );
}
