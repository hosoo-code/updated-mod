import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  Banknote,
  ShieldCheck,
  Users,
  Wallet,
  ScanFace,
  FileCheck2,
  MapPin,
  CheckCircle2,
} from "lucide-react";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { VerifiedBadge } from "@/components/ui/verified-badge";
import { CopyButton } from "@/components/ui/copy-button";
import {
  getActiveAccounts,
  getActiveGroups,
  getActivePrices,
  getPublicModerators,
} from "@/lib/repo";
import { formatMemberCount, formatTugrik } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  let moderators: Awaited<ReturnType<typeof getPublicModerators>> = [];
  let groups: Awaited<ReturnType<typeof getActiveGroups>> = [];
  let prices: Awaited<ReturnType<typeof getActivePrices>> = [];
  let accounts: Awaited<ReturnType<typeof getActiveAccounts>> = [];

  try {
    [moderators, groups, prices, accounts] = await Promise.all([
      getPublicModerators(),
      getActiveGroups(),
      getActivePrices(),
      getActiveAccounts(),
    ]);
  } catch (err) {
    // Supabase холболт/schema-тай холбоотой алдааг бүх хуудсыг унагаахгүйгээр
    // Vercel Runtime Logs-д бүрэн харуулна. Хуудас хоосон section-уудтай ачаална.
    console.error("[HomePage] Data fetch failed:", err);
  }

  const totalMembers = groups.reduce((acc, g) => acc + g.memberCount, 0);
  const verifiedCount = moderators.filter((m) => m.verificationStatus === "approved").length;

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />

      <main className="flex-1">
        {/* ============ HERO ============ */}
        <section className="relative overflow-hidden bg-zinc-50 dark:bg-zinc-950">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-zinc-200 dark:bg-white/10" />
          <div className="mx-auto max-w-6xl px-4 pb-16 pt-12 sm:px-6 sm:pb-20 sm:pt-24">
            <div className="mx-auto max-w-2xl text-center">
              <span className="inline-flex items-center gap-2 rounded-full border border-zinc-300 bg-white px-4 py-1.5 text-xs font-semibold text-zinc-700 shadow-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 animate-fade-up">
                <ShieldCheck className="h-3.5 w-3.5" />
                Mobile Legends нийгэмлэгийн итгэлцлийн платформ
              </span>
              <h1
                className="mt-6 text-4xl font-bold leading-[1.1] tracking-tight text-zinc-900 dark:text-white sm:text-6xl animate-fade-up"
                style={{ animationDelay: "80ms" }}
              >
                Баталгаатай{" "}
                <span className="text-zinc-500 dark:text-zinc-400">Moderator-ууд</span>
              </h1>
              <p
                className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-zinc-600 dark:text-zinc-400 sm:text-lg animate-fade-up"
                style={{ animationDelay: "160ms" }}
              >
                Moderator-ийн мэдээлэл, group, үйлчилгээ болон баталгаажуулалтыг нэг дор.
              </p>
              <div
                className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row animate-fade-up"
                style={{ animationDelay: "240ms" }}
              >
                <Button size="xl" asChild>
                  <Link href="/moderator/apply">
                    Moderator болох <ArrowRight className="h-5 w-5" />
                  </Link>
                </Button>
                <Button size="xl" variant="secondary" asChild>
                  <Link href="/moderators">
                    <Users className="h-5 w-5" /> Moderator-ууд харах
                  </Link>
                </Button>
              </div>

              {/* Stats strip */}
              <div
                className="mx-auto mt-10 grid max-w-2xl grid-cols-3 gap-2 sm:mt-14 sm:gap-3 animate-fade-up"
                style={{ animationDelay: "320ms" }}
              >
                <HeroStat value={String(verifiedCount)} label="Баталгаажсан moderator" />
                <HeroStat value={String(groups.length)} label="Group" />
                <HeroStat value={formatMemberCount(totalMembers)} label="Нийт member" />
              </div>
            </div>
          </div>
        </section>

        {/* ============ VERIFIED MODERATORS ============ */}
        <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <SectionHeader
            eyebrow="Баталгаажсан"
            title="Moderator-ууд"
            subtitle="Identity verification-д бүрэн тэнцсэн, итгэмжлэгдсэн moderator-ууд."
            action={<Link href="/moderators" className="text-sm font-semibold text-zinc-900 hover:underline dark:text-white">Бүгдийг харах →</Link>}
          />
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {moderators.slice(0, 6).map((m, i) => (
              <Link key={m.id} href={`/moderators/${m.id}`} className="group">
                <Card className="h-full transition-all duration-200 group-hover:-translate-y-0.5 group-hover:border-zinc-400 group-hover:shadow-md dark:group-hover:border-zinc-600">
                  <CardContent className="p-5">
                    <div className="flex items-start gap-3.5">
                      <Avatar name={m.fullName} src={m.avatarUrl} size="lg" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold text-zinc-900 dark:text-white">{m.nickname}</p>
                        <p className="truncate text-xs text-zinc-400">{m.fullName}</p>
                        <div className="mt-2">
                          {m.verificationStatus === "approved" ? <VerifiedBadge size="sm" withText={false} /> : null}
                        </div>
                      </div>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-1.5">
                      {m.groups.slice(0, 2).map((g) => (
                        <span key={g.id} className="rounded-full bg-zinc-100 px-2.5 py-1 text-[11px] font-medium text-zinc-500 dark:bg-white/8 dark:text-zinc-400">
                          {g.name.length > 22 ? g.name.slice(0, 22) + "…" : g.name}
                        </span>
                      ))}
                      {m.groups.length > 2 ? (
                        <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-[11px] text-zinc-400 dark:bg-white/8">
                          +{m.groups.length - 2}
                        </span>
                      ) : null}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </section>

        {/* ============ GROUPS ============ */}
        <section className="border-y border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900/40">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
            <SectionHeader
              eyebrow="Нийгэмлэг"
              title="Facebook Group-ууд"
              subtitle="Moderator-уудын хариуцдаг, идэвхтэй group-уудын мэдээлэл."
            />
            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              {groups.map((g) => (
                <Card key={g.id} className="transition-all duration-300 hover:-translate-y-0.5">
                  <CardContent className="flex items-start justify-between gap-4 p-5">
                    <div className="flex min-w-0 items-start gap-3.5">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-zinc-100 text-zinc-900 dark:bg-white/10 dark:text-white">
                        <Users className="h-6 w-6" />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-zinc-900 dark:text-white">{g.name}</p>
                        <p className="mt-1 flex items-center gap-1.5 text-xs text-zinc-400">
                          <Users className="h-3.5 w-3.5" />
                          {formatMemberCount(g.memberCount)} member
                        </p>
                        <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
                          {g.description}
                        </p>
                        <div className="mt-3 flex flex-wrap items-center gap-1.5">
                          {g.moderators.slice(0, 3).map((mod) => (
                            <span key={mod.id} className="inline-flex items-center gap-1 rounded-full border border-zinc-200 px-2 py-0.5 text-[11px] font-medium text-zinc-600 dark:border-white/10 dark:text-zinc-300">
                              {mod.isPrimary ? <BadgeCheck className="h-3 w-3 text-zinc-500 dark:text-zinc-300" /> : null}
                              {mod.name}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                    {g.facebookUrl ? (
                      <a
                        href={g.facebookUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="shrink-0 rounded-lg bg-[#1877F2]/10 px-3 py-1.5 text-xs font-semibold text-[#1877F2] transition hover:bg-[#1877F2]/15 dark:text-[#6da3ff]"
                      >
                        Group
                      </a>
                    ) : null}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* ============ PRICES ============ */}
        <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <SectionHeader
            eyebrow="Үйлчилгээ"
            title="Үнийн санал"
            subtitle="Moderator үйлчилгээний багцын үнэ — бүх төрлийн хугацаанд."
          />
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {prices.map((p, i) => (
              <Card
                key={p.id}
                className={
                  "relative overflow-hidden transition-all duration-300 hover:-translate-y-1 " +
                  (i === prices.length - 1 ? "border-zinc-400 shadow-md dark:border-zinc-600" : "")
                }
              >
                {i === prices.length - 1 ? (
                  <span className="absolute right-4 top-4 rounded-full border border-zinc-300 bg-zinc-100 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-zinc-700 dark:border-white/15 dark:bg-white/10 dark:text-zinc-200">
                    Хамгийн ашигтай
                  </span>
                ) : null}
                <CardContent className="p-5">
                  <p className="text-sm font-semibold text-zinc-500 dark:text-zinc-400">{p.title}</p>
                  <p className="mt-2 text-2xl font-bold tabular-nums tracking-tight text-zinc-900 dark:text-white">
                    {formatTugrik(p.price)}
                  </p>
                  {p.description ? (
                    <p className="mt-2 text-xs leading-relaxed text-zinc-400">{p.description}</p>
                  ) : null}
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* ============ PAYMENT ACCOUNTS ============ */}
        <section className="border-y border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900/40">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
            <SectionHeader
              eyebrow="Төлбөр"
              title="Төлбөр төлөх данс"
              subtitle="Албан ёсны, идэвхтэй дансууд. Дансны дугаарыг нэг товшилтоор хуулна."
            />
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {accounts.map((a) => (
                <Card key={a.id} className="transition-all duration-300 hover:-translate-y-0.5">
                  <CardContent className="flex flex-col gap-3 p-5">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-100 dark:bg-white/10">
                        <Banknote className="h-5 w-5 text-zinc-900 dark:text-white" />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-zinc-900 dark:text-white">{a.bankName}</p>
                        <p className="truncate text-xs text-zinc-400">{a.accountHolder}</p>
                      </div>
                    </div>
                    <p className="font-mono text-lg font-semibold tabular-nums tracking-wider text-zinc-800 dark:text-zinc-100">
                      {a.accountNumber}
                    </p>
                    {a.note ? <p className="text-xs text-zinc-400">{a.note}</p> : null}
                    <CopyButton value={a.accountNumber} />
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* ============ VERIFICATION PROCESS ============ */}
        <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <SectionHeader
            eyebrow="Хэрхэн ажилладаг вэ?"
            title="Баталгаажуулалтын үйл явц"
            subtitle="Мэргэжлийн түвшний, алхам алхмаар явагдах identity verification."
          />
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: <FileCheck2 className="h-5 w-5" />, step: "01", title: "Баримт", text: "Иргэний үнэмлэх эсвэл төрсний гэрчилгээгээ камераар авах" },
              { icon: <ScanFace className="h-5 w-5" />, step: "02", title: "Нүүрний шалгалт", text: "Real-time guidance бүхий face + liveness шалгалт" },
              { icon: <MapPin className="h-5 w-5" />, step: "03", title: "Байршил (заавал биш)", text: "Зөвшөөрсөн тохиолдолд ойролцоо байршлыг баталгаажуулна" },
              { icon: <CheckCircle2 className="h-5 w-5" />, step: "04", title: "Admin хяналт", text: "Admin баг шалгаад VERIFIED badge олгоно" },
            ].map((s, i) => (
              <div key={s.step} className="relative">
                {i < 3 ? (
                  <div className="absolute right-0 top-7 hidden h-px w-6 translate-x-full bg-gradient-to-r from-zinc-300 to-transparent dark:from-white/15 lg:block" />
                ) : null}
                <Card className="h-full transition-all duration-300 hover:-translate-y-0.5">
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between">
                      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-100 text-zinc-900 dark:bg-white/10 dark:text-white">
                        {s.icon}
                      </span>
                      <span className="text-2xl font-bold text-zinc-200 dark:text-white/10">{s.step}</span>
                    </div>
                    <p className="mt-4 text-sm font-semibold text-zinc-900 dark:text-white">{s.title}</p>
                    <p className="mt-1.5 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">{s.text}</p>
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>
        </section>

        {/* ============ CTA ============ */}
        <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6">
          <div className="relative overflow-hidden rounded-3xl border border-zinc-200 bg-white px-6 py-12 text-center shadow-sm dark:border-zinc-800 dark:bg-zinc-900/60 sm:py-14">
            <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-zinc-200/60 blur-3xl dark:bg-zinc-700/20" />
            <h2 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white sm:text-3xl">
              Moderator болж, итгэлцлийг бүтээе
            </h2>
            <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
              Өргөдлөө өгөөд, identity verification-оо хийж, VERIFIED MODERATOR badge-аа аваарай.
            </p>
            <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button size="lg" asChild>
                <Link href="/moderator/apply">
                  Moderator болох <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button size="lg" variant="secondary" asChild>
                <Link href="/verify">
                  <Wallet className="h-4 w-4" /> Баталгаажуулалт эхлүүлэх
                </Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}

function SectionHeader({
  eyebrow,
  title,
  subtitle,
  action,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
          {eyebrow}
        </p>
        <h2 className="mt-2 text-2xl font-bold tracking-tight text-zinc-900 dark:text-white sm:text-3xl">
          {title}
        </h2>
        <p className="mt-2 max-w-lg text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
          {subtitle}
        </p>
      </div>
      {action}
    </div>
  );
}

function HeroStat({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-2xl border border-zinc-200/80 bg-white/70 px-4 py-4 text-center backdrop-blur dark:border-white/8 dark:bg-white/[0.04]">
      <p className="text-2xl font-bold tabular-nums tracking-tight text-zinc-900 dark:text-white">{value}</p>
      <p className="mt-1 text-xs text-zinc-400">{label}</p>
    </div>
  );
                }
