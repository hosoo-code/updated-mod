"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarClock, CheckCircle2, Clock, MapPin, RefreshCw, ShieldCheck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { formatDateTime, daysUntil } from "@/lib/utils";
import type { WeeklyStatus } from "@/types";

/**
 * 7 хоногийн баталгаажуулалт — user ӨӨРӨӨ эхлүүлсэн үед л ажиллана.
 * Background tracking, чимээгүй GPS БАЙХГҮЙ.
 * IP зөвхөн сервер талд бүртгэгдэнэ.
 */
export function WeeklyVerification({ weekly: initial }: { weekly: WeeklyStatus }) {
  const router = useRouter();
  const toast = useToast();
  const [weekly, setWeekly] = useState(initial);
  const [step, setStep] = useState<"idle" | "consent" | "running" | "done">("idle");
  const [consentChecked, setConsentChecked] = useState(false);

  const run = useCallback(
    async (withLocation: boolean) => {
      setStep("running");
      try {
        let body: Record<string, unknown> = {};
        if (withLocation) {
          if (!("geolocation" in navigator)) throw new Error("BAYRSHIL_BOLOMJGUI");
          try {
            const consentRes = await fetch("/api/consents", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ version: "1.0", purpose: "location" }),
            });
            const consentJson = await consentRes.json();
            const position = await new Promise<GeolocationPosition>((resolve, reject) =>
              navigator.geolocation.getCurrentPosition(resolve, reject, {
                enableHighAccuracy: false,
                timeout: 10_000,
                maximumAge: 300_000,
              })
            );
            body = {
              consentId: consentJson.ok ? consentJson.data.consentId : undefined,
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              accuracy: position.coords.accuracy,
            };
          } catch (e) {
            if (e instanceof GeolocationPositionError && e.code === e.PERMISSION_DENIED) {
              toast.error("Байршил ашиглах зөвшөөрөл татгалзсан — IP бүртгэлээр үргэлжлүүлж байна.");
              body = {};
            } else {
              toast.error("Байршил тодорхойлох боломжгүй — IP бүртгэлээр үргэлжлүүлж байна.");
              body = {};
            }
          }
        }
        const res = await fetch("/api/weekly", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const json = await res.json();
        if (!json.ok) throw new Error(json.error ?? "Алдаа гарлаа.");
        const fresh = await fetch("/api/weekly").then((r) => r.json());
        if (fresh.ok) setWeekly(fresh.data);
        setStep("done");
        toast.success("7 хоногийн баталгаажуулалт амжилттай.");
        router.refresh();
      } catch (e) {
        setStep("idle");
        toast.error(e instanceof Error ? e.message : "Алдаа гарлаа. Дахин оролдоно уу.");
      }
    },
    [router, toast]
  );

  const due = weekly.due;
  const daysLeft = weekly.nextVerificationAt ? daysUntil(weekly.nextVerificationAt) : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarClock className="h-4 w-4 text-brand-500" /> 7 хоногийн баталгаажуулалт
        </CardTitle>
        <CardDescription>Долоо хоног бүрийн итгэлцлийн шалгалт</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!weekly.enabled ? (
          <p className="text-sm text-zinc-400">7 хоногийн баталгаажуулалт идэвхгүй байна.</p>
        ) : due ? (
          step === "done" ? (
            <SuccessBox nextAt={weekly.nextVerificationAt} />
          ) : step === "running" ? (
            <div className="flex flex-col items-center gap-3 rounded-xl border border-brand-500/25 bg-brand-500/8 px-4 py-8 text-center">
              <RefreshCw className="h-8 w-8 animate-spin text-brand-500" />
              <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                Баталгаажуулж байна… Сервер IP бүртгэж байна.
              </p>
            </div>
          ) : step === "consent" ? (
            <div className="space-y-3">
              <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
                Баталгаажуулалтын үеэр:
              </p>
              <ul className="space-y-1.5 text-xs text-zinc-500 dark:text-zinc-400">
                <li>· Сервер талд IP хаяг бүртгэгдэнэ (аюулгүй байдлын зорилгоор)</li>
                <li>· Зөвшөөрвөл ойролцоо байршил (≈1км) бүртгэгдэнэ</li>
                <li>· Байнгын ажиглалт хийгдэхгүй — зөвхөн энэ үед л</li>
              </ul>
              <label className="flex cursor-pointer items-start gap-2.5 rounded-xl border border-zinc-200 p-3 text-sm text-zinc-700 dark:border-white/10 dark:text-zinc-200">
                <input
                  type="checkbox"
                  checked={consentChecked}
                  onChange={(e) => setConsentChecked(e.target.checked)}
                  className="mt-0.5 h-4 w-4 accent-brand-500"
                />
                Би мэдээлэлтэй танилцаж, баталгаажуулалт хийхийг зөвшөөрч байна.
              </label>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button full disabled={!consentChecked} onClick={() => run(true)}>
                  <MapPin className="h-4 w-4" /> Байршилтай баталгаажуулах
                </Button>
                <Button full variant="secondary" disabled={!consentChecked} onClick={() => run(false)}>
                  <ShieldCheck className="h-4 w-4" /> Зөвхөн IP-ээр баталгаажуулах
                </Button>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setStep("idle")}>Буцах</Button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="rounded-xl border border-amber-500/25 bg-amber-500/8 px-4 py-3">
                <p className="text-sm font-semibold text-amber-700 dark:text-amber-300">
                  7 хоногийн баталгаажуулалт хийх шаардлагатай байна.
                </p>
                <p className="mt-1 text-xs leading-relaxed text-amber-600/90 dark:text-amber-300/80">
                  Moderator итгэлцлийг хадгалахын тулд 7 хоног тутамд нэг удаа баталгаажуулалт хийдэг.
                  Та эхлүүлсэн үед л мэдээлэл бүртгэгдэнэ.
                </p>
              </div>
              <Button full onClick={() => setStep("consent")}>
                Одоо баталгаажуулах
              </Button>
            </div>
          )
        ) : (
          <div className="space-y-3">
            <div className="rounded-xl border border-brand-500/25 bg-brand-500/8 px-4 py-3">
              <p className="flex items-center gap-2 text-sm font-semibold text-brand-700 dark:text-brand-300">
                <CheckCircle2 className="h-4 w-4" /> Баталгаажсан
              </p>
              <p className="mt-1 text-xs text-brand-600/90 dark:text-brand-300/80">
                Таны дараагийн баталгаажуулалт {weekly.nextVerificationAt ? formatDateTime(weekly.nextVerificationAt) : "—"}.
                {daysLeft > 0 ? ` (${daysLeft} хоногийн дараа)` : " (өнөөдөр)"}
              </p>
            </div>
            {weekly.lastVerificationAt ? (
              <p className="flex items-center gap-1.5 text-xs text-zinc-400">
                <Clock className="h-3.5 w-3.5" />
                Сүүлд: {formatDateTime(weekly.lastVerificationAt)}
              </p>
            ) : null}
          </div>
        )}

        {/* History */}
        {weekly.history.length > 0 ? (
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Түүх</p>
            {weekly.history.slice(0, 5).map((h) => (
              <div
                key={h.id}
                className="flex items-center justify-between gap-3 rounded-lg bg-zinc-100/70 px-3 py-2 text-xs dark:bg-white/[0.04]"
              >
                <span className="text-zinc-500 dark:text-zinc-400">{formatDateTime(h.createdAt)}</span>
                <span className="font-mono text-zinc-600 dark:text-zinc-300">{h.ip}</span>
                <span className={h.status === "verified" ? "font-semibold text-brand-600 dark:text-brand-300" : "font-semibold text-rose-500"}>
                  {h.status === "verified" ? "Баталгаажсан" : "Амжилтгүй"}
                </span>
              </div>
            ))}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function SuccessBox({ nextAt }: { nextAt: string | null }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-xl border border-brand-500/25 bg-brand-500/8 px-4 py-6 text-center">
      <CheckCircle2 className="h-9 w-9 text-brand-400" />
      <p className="text-sm font-semibold text-zinc-900 dark:text-white">Баталгаажуулалт амжилттай</p>
      <p className="text-xs text-zinc-500 dark:text-zinc-400">
        Дараагийн баталгаажуулалт: {nextAt ? formatDateTime(nextAt) : "—"}
      </p>
    </div>
  );
}
