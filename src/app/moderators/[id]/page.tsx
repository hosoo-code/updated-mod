import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  BadgeCheck,
  Calendar,
  Facebook,
  MapPin,
  Phone,
  Users,
} from "lucide-react";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { VerifiedBadge } from "@/components/ui/verified-badge";
import { StatusBadge } from "@/components/ui/badge";
import { getPublicModerator } from "@/lib/repo";
import { formatDate, formatMemberCount } from "@/lib/utils";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const m = await getPublicModerator(id);
  return { title: m ? m.nickname : "Moderator олдсонгүй" };
}

/**
 * PUBLIC PROFILE — зөвхөн нийтийн талбарууд.
 * Identity document, төрсний гэрчилгээ, яг координат, IP, гэрийн хаяг,
 * эцэг/эхийн утас ХЭЗЭЭ Ч энд харагдахгүй.
 */
export default async function ModeratorProfilePage({ params }: PageProps) {
  const { id } = await params;
  const m = await getPublicModerator(id);
  if (!m) notFound();

  const verified = m.verificationStatus === "approved";

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-10 sm:px-6">
        <Link
          href="/moderators"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-zinc-500 transition hover:text-zinc-900 dark:hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" /> Moderator-ууд руу буцах
        </Link>

        {/* Profile header */}
        <Card className="mt-6 overflow-hidden">
          <div className="relative h-28 bg-gradient-to-r from-brand-500/25 via-teal-500/15 to-transparent">
            <div className="absolute inset-0 bg-[radial-gradient(80%_120%_at_20%_0%,rgba(16,185,129,0.25),transparent)]" />
          </div>
          <CardContent className="-mt-10 p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div className="flex items-end gap-4">
                <Avatar name={m.fullName} src={m.avatarUrl} size="xl" className="ring-4 ring-white dark:ring-ink-900" />
                <div className="pb-1">
                  <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">
                    {m.nickname}
                  </h1>
                  <p className="mt-0.5 text-sm text-zinc-400">{m.fullName}</p>
                </div>
              </div>
              <div className="flex flex-col items-start gap-2 pb-1 sm:items-end">
                {verified ? <VerifiedBadge size="md" /> : <StatusBadge status={m.verificationStatus} />}
                {verified && m.verifiedAt ? (
                  <p className="flex items-center gap-1.5 text-xs text-zinc-400">
                    <BadgeCheck className="h-3.5 w-3.5 text-gold-500" />
                    Баталгаажсан: {formatDate(m.verifiedAt)}
                  </p>
                ) : null}
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="mt-6 grid gap-4 lg:grid-cols-3">
          {/* Left column */}
          <div className="space-y-4 lg:col-span-2">
            {/* Groups */}
            <Card>
              <CardContent className="p-6">
                <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-zinc-400">
                  <Users className="h-4 w-4" /> Хариуцдаг group-ууд
                </h2>
                <div className="mt-4 space-y-3">
                  {m.groups.map((g) => (
                    <div
                      key={g.id}
                      className="flex items-center justify-between gap-3 rounded-xl border border-zinc-200/80 bg-white/60 px-4 py-3 dark:border-white/8 dark:bg-white/[0.03]"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-zinc-900 dark:text-white">
                          {g.isPrimary ? (
                            <BadgeCheck className="mr-1 inline h-4 w-4 text-brand-500" />
                          ) : null}
                          {g.name}
                        </p>
                        <p className="mt-0.5 text-xs text-zinc-400">{formatMemberCount(g.memberCount)} member</p>
                      </div>
                      {g.isActive ? (
                        <span className="rounded-full bg-brand-500/10 px-2.5 py-1 text-[11px] font-semibold text-brand-600 dark:text-brand-300">
                          Идэвхтэй
                        </span>
                      ) : null}
                    </div>
                  ))}
                  {m.groups.length === 0 ? (
                    <p className="text-sm text-zinc-400">Group мэдээлэл оруулаагүй байна.</p>
                  ) : null}
                </div>
              </CardContent>
            </Card>

            {/* Info */}
            <Card>
              <CardContent className="p-6">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">Мэдээлэл</h2>
                <dl className="mt-4 space-y-4">
                  {m.phone ? (
                    <InfoItem icon={<Phone className="h-4 w-4" />} label="Утас" value={m.phone} href={`tel:${m.phone.replace(/\s/g, "")}`} />
                  ) : null}
                  {m.facebookUrl ? (
                    <InfoItem icon={<Facebook className="h-4 w-4" />} label="Facebook" value="Профайл харах" href={m.facebookUrl} external />
                  ) : null}
                  {m.locationText ? (
                    <InfoItem icon={<MapPin className="h-4 w-4" />} label="Байршил" value={m.locationText} />
                  ) : null}
                  <InfoItem icon={<Calendar className="h-4 w-4" />} label="Moderator болсон" value={formatDate(m.becameModeratorAt)} />
                </dl>
              </CardContent>
            </Card>
          </div>

          {/* Right column */}
          <div className="space-y-4">
            <Card className="border-gold-500/25">
              <CardContent className="p-6 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-gold-500/20 to-amber-500/10">
                  <BadgeCheck className="h-7 w-7 text-gold-500" />
                </div>
                <h3 className="mt-3 text-sm font-semibold text-zinc-900 dark:text-white">Баталгаажуулалт</h3>
                <p className="mt-1.5 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
                  {verified
                    ? "Энэхүү moderator нь identity verification-д бүрэн тэнцсэн."
                    : m.verificationStatus === "pending"
                      ? "Баталгаажуулалт admin багийн хяналтад явж байна."
                      : "Баталгаажуулалт хийгдээгүй байна."}
                </p>
                <div className="mt-4">
                  {verified ? <VerifiedBadge withText={false} size="md" /> : <StatusBadge status={m.verificationStatus} />}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">Хувийн нууцлал</h3>
                <p className="mt-3 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
                  Энэ хуудсанд зөвхөн нийтэд зориулсан мэдээлэл харагдана. Identity баримт,
                  гэрийн хаяг, IP, яг байршил зэрэг хувийн мэдээлэл хэзээ ч нийтэд харагдахгүй.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

function InfoItem({
  icon,
  label,
  value,
  href,
  external,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  href?: string;
  external?: boolean;
}) {
  const content = (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-zinc-100 text-zinc-500 dark:bg-white/8 dark:text-zinc-400">
        {icon}
      </span>
      <div className="min-w-0">
        <dt className="text-xs text-zinc-400">{label}</dt>
        <dd className="truncate text-sm font-medium text-zinc-800 dark:text-zinc-200">{value}</dd>
      </div>
    </div>
  );
  return href ? (
    <a href={href} target={external ? "_blank" : undefined} rel={external ? "noopener noreferrer" : undefined} className="block transition hover:opacity-80">
      {content}
    </a>
  ) : (
    content
  );
}
