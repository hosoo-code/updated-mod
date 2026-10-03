import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, BadgeCheck, CalendarClock, CheckCircle2, FileCheck2, MapPin, ShieldCheck } from "lucide-react";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { VerifiedBadge } from "@/components/ui/verified-badge";
import { LocationShare } from "@/components/location/location-share";
import { WeeklyVerification } from "./weekly-verification";
import { getSessionUser } from "@/lib/auth";
import { getModeratorForUser, getMyVerifications, getWeeklyStatus } from "@/lib/repo";
import { formatDate, formatDateTime } from "@/lib/utils";

export const metadata: Metadata = { title: "Миний dashboard" };
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/dashboard");

  let moderator: Awaited<ReturnType<typeof getModeratorForUser>> = null;
  let verifications: Awaited<ReturnType<typeof getMyVerifications>> = [];
  let weekly: Awaited<ReturnType<typeof getWeeklyStatus>> = {
    verified: false,
    lastVerificationAt: null,
    nextVerificationAt: null,
    due: false,
    enabled: false,
    history: [],
  };
  try {
    [moderator, verifications, weekly] = await Promise.all([
      getModeratorForUser(user.id),
      getMyVerifications(user.id),
      getWeeklyStatus(user.id),
    ]);
  } catch (err) {
    // Production-д Supabase/schema/env алдаа гарвал dashboard-ыг унагаахгүй.
    console.error("[DashboardPage] Data fetch failed:", err);
  }

  const latest = verifications[0] ?? null;
  const isApproved = moderator?.verificationStatus === "approved";
  const statusLabel = !moderator ? "Өргөдөл гаргаагүй" : isApproved ? "Баталгаажсан" : moderator.verificationStatus === "pending" ? "Хянагдаж байна" : "Дахин шалгах шаардлагатай";

  return (
    <div className="flex min-h-screen flex-col bg-[#f5f5f7] dark:bg-zinc-950">
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 sm:py-10">
        <section className="relative mb-6 overflow-hidden rounded-3xl bg-zinc-950 px-5 py-6 text-white shadow-xl shadow-zinc-900/10 sm:px-8 sm:py-8 dark:bg-white dark:text-zinc-950">
          <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-brand-500/25 blur-3xl dark:bg-brand-500/20" />
          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-white/55 dark:text-zinc-500">
                <ShieldCheck className="h-4 w-4 text-brand-400" /> Таны workspace
              </p>
              <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
                Сайн уу, {moderator?.nickname ?? user.fullName ?? "Хэрэглэгч"}
              </h1>
              <p className="mt-2 max-w-xl text-sm leading-6 text-white/65 dark:text-zinc-500">
                Баталгаажуулалт, төлөв, долоо хоногийн шалгалт — нэг дор.
              </p>
            </div>
            <div className="flex items-center gap-3 rounded-2xl border border-white/15 bg-white/10 px-4 py-3 backdrop-blur-sm dark:border-zinc-200 dark:bg-zinc-100">
              <span className={`flex h-2.5 w-2.5 rounded-full ${isApproved ? "bg-emerald-400" : "bg-amber-400"}`} />
              <div>
                <p className="text-[11px] font-medium uppercase tracking-wider text-white/50 dark:text-zinc-500">Профайлын төлөв</p>
                <p className="mt-0.5 text-sm font-semibold">{statusLabel}</p>
              </div>
              {isApproved ? <VerifiedBadge size="sm" /> : null}
            </div>
          </div>
        </section>

        <div className="mb-6 flex flex-wrap gap-2">
          <Button asChild size="sm"><Link href="/moderator/apply">{moderator ? "Профайлаа шинэчлэх" : "Moderator болох"} <ArrowRight className="h-4 w-4" /></Link></Button>
          <Button asChild size="sm" variant="secondary"><Link href="/moderators">Moderator-уудыг харах</Link></Button>
        </div>

        <div className="mb-6 grid gap-3 sm:grid-cols-3">
          <SummaryTile icon={<ShieldCheck className="h-4 w-4" />} label="Профайл" value={statusLabel} tone={isApproved ? "good" : "neutral"} />
          <SummaryTile icon={<CalendarClock className="h-4 w-4" />} label="7 хоногийн шалгалт" value={!weekly.enabled ? "Идэвхгүй" : weekly.due ? "Хийх шаардлагатай" : "Идэвхтэй"} tone={weekly.due ? "warning" : "good"} />
          <SummaryTile icon={<FileCheck2 className="h-4 w-4" />} label="Нийт хүсэлт" value={`${verifications.length}`} tone="neutral" />
        </div>

        {/* Identity verification status */}
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-brand-500" /> Identity баталгаажуулалт
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {!moderator ? (
                <div className="space-y-3">
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">
                    Moderator профайл олдоогүй байна. Эхлээд moderator болох өргөдлөө өгнө үү.
                  </p>
                  <Button asChild size="sm">
                    <Link href="/moderator/apply">Moderator болох</Link>
                  </Button>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-zinc-500 dark:text-zinc-400">Status</span>
                    <StatusBadge status={moderator.verificationStatus} />
                  </div>
                  {moderator.verifiedAt ? (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-zinc-500 dark:text-zinc-400">Баталгаажсан огноо</span>
                      <span className="text-sm font-medium text-zinc-900 dark:text-white">{formatDate(moderator.verifiedAt)}</span>
                    </div>
                  ) : null}
                  {latest?.status === "rejected" ? (
                    <div className="rounded-xl border border-rose-500/25 bg-rose-500/8 px-4 py-3 text-sm text-rose-600 dark:text-rose-300">
                      <p className="font-semibold">Татгалзсан шалтгаан: {latest.rejectReason ? reasonLabel(latest.rejectReason) : "—"}</p>
                      {latest.rejectNote ? <p className="mt-1 text-xs">{latest.rejectNote}</p> : null}
                    </div>
                  ) : null}
                  {moderator.verificationStatus === "approved" ? (
                    <p className="flex items-center gap-2 text-sm text-brand-600 dark:text-brand-300">
                      <BadgeCheck className="h-4 w-4" /> Баталгаажсан — VERIFIED MODERATOR
                    </p>
                  ) : moderator.verificationStatus === "pending" ? (
                    <p className="text-sm text-amber-600 dark:text-amber-300">
                      Admin багийн хяналтад явж байна. Түр хүлээнэ үү.
                    </p>
                  ) : (
                    <Button asChild>
                      <Link href="/moderator/apply">
                        {latest?.status === "resubmit_requested" ? "Дахин баталгаажуулах" : "Баталгаажуулалт эхлүүлэх"}
                      </Link>
                    </Button>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {/* Weekly verification */}
          <WeeklyVerification weekly={weekly} />

          {/* Location share — 7 хоногийн expires_at-тай */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-brand-500" /> Байршил
              </CardTitle>
            </CardHeader>
            <CardContent>
              <LocationShare />
            </CardContent>
          </Card>

          {/* Recent verification requests */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileCheck2 className="h-4 w-4 text-brand-500" /> Хүсэлтүүд
              </CardTitle>
            </CardHeader>
            <CardContent>
              {verifications.length === 0 ? (
                <p className="text-sm text-zinc-400">Хүсэлт алга.</p>
              ) : (
                <div className="space-y-3">
                  {verifications.map((v) => (
                    <div
                      key={v.id}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 dark:border-white/10 dark:bg-white/[0.04]"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-zinc-900 dark:text-white">
                          {v.documentType === "id-card" ? "Иргэний үнэмлэх" : "Төрсний гэрчилгээ"}
                          <span className="ml-2 font-mono text-xs text-zinc-400">#{v.id.slice(0, 8)}</span>
                        </p>
                        <p className="mt-0.5 text-xs text-zinc-400">
                          Илгээсэн {formatDateTime(v.submittedAt ?? v.createdAt)}
                        </p>
                      </div>
                      <StatusBadge status={v.status} />
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

function SummaryTile({ icon, label, value, tone }: { icon: ReactNode; label: string; value: string; tone: "good" | "warning" | "neutral" }) {
  const color = tone === "good" ? "text-brand-600 dark:text-brand-300" : tone === "warning" ? "text-amber-600 dark:text-amber-300" : "text-zinc-700 dark:text-zinc-200";
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-zinc-200/80 bg-white px-4 py-3.5 shadow-sm dark:border-white/10 dark:bg-zinc-900">
      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-zinc-100 dark:bg-white/10 ${color}`}>{icon}</span>
      <div className="min-w-0"><p className="text-[11px] font-medium uppercase tracking-wider text-zinc-400">{label}</p><p className={`mt-0.5 truncate text-sm font-semibold ${color}`}>{value}</p></div>
    </div>
  );
}

function reasonLabel(reason: string): string {
  const map: Record<string, string> = {
    unclear: "Баримт тодорхойгүй",
    expired_document: "Баримтны хугацаа дууссан",
    face_failed: "Нүүрний баталгаажуулалт амжилтгүй",
    mismatch: "Мэдээлэл таарахгүй",
    other: "Бусад",
  };
  return map[reason] ?? reason;
}
