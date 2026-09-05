import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { BadgeCheck, CalendarClock, FileCheck2, MapPin, ShieldCheck, Wifi } from "lucide-react";
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

  const [moderator, verifications, weekly] = await Promise.all([
    getModeratorForUser(user.id),
    getMyVerifications(user.id),
    getWeeklyStatus(user.id),
  ]);

  const latest = verifications[0] ?? null;

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10 sm:px-6">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-600 dark:text-brand-300">
              Dashboard
            </p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-zinc-900 dark:text-white">
              Сайн уу, {moderator?.nickname ?? user.fullName ?? "Хэрэглэгч"} 👋
            </h1>
            <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
              Баталгаажуулалтын status болон 7 хоногийн шалгалтаа эндээс харна.
            </p>
          </div>
          {moderator?.verificationStatus === "approved" ? <VerifiedBadge size="lg" /> : null}
        </div>

        {/* Identity verification status */}
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-brand-500" /> Identity баталгаажуулалт
              </CardTitle>
              <CardDescription>Иргэний үнэмлэх, нүүрний шалгалт, байршил</CardDescription>
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
                      <Link href="/verify">
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
                <MapPin className="h-4 w-4 text-brand-500" /> 📍 Байршил
              </CardTitle>
              <CardDescription>
                7 хоног тутам дахин хуваалцах шаардлагатай. Зөвхөн эрх бүхий admin харна.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <LocationShare />
            </CardContent>
          </Card>

          {/* Recent verification requests */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileCheck2 className="h-4 w-4 text-brand-500" /> Баталгаажуулалтын хүсэлтүүд
              </CardTitle>
              <CardDescription>Таны илгээсэн хүсэлтүүдийн түүх</CardDescription>
            </CardHeader>
            <CardContent>
              {verifications.length === 0 ? (
                <p className="text-sm text-zinc-400">Одоогоор хүсэлт илгээгээгүй байна.</p>
              ) : (
                <div className="space-y-3">
                  {verifications.map((v) => (
                    <div
                      key={v.id}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-200/80 bg-white/60 px-4 py-3 dark:border-white/8 dark:bg-white/[0.03]"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-zinc-900 dark:text-white">
                          {v.documentType === "id-card" ? "Иргэний үнэмлэх" : "Төрсний гэрчилгээ"}
                          <span className="ml-2 font-mono text-xs text-zinc-400">#{v.id.slice(0, 8)}</span>
                        </p>
                        <p className="mt-0.5 text-xs text-zinc-400">
                          Илгээсэн: {formatDateTime(v.submittedAt ?? v.createdAt)}
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
