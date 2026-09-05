"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Banknote,
  Check,
  CheckCircle2,
  Fingerprint,
  Globe,
  Lock,
  MapPin,
  Phone,
  PencilLine,
  ScanFace,
  ShieldCheck,
  Trash2,
  User,
  Users,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/input";
import { StatusBadge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import { formatDateTime } from "@/lib/utils";
import type { ModeratorApplicationData } from "@/types";

const FRONT_LABELS: string[] = ["Урд (шууд)", "Урд (баруун)", "Урд (зүүн)"];
const BACK_LABELS: string[] = ["Ард (шууд)", "Ард (баруун)", "Ард (зүүн)"];

export function ApplicationReview({
  app,
  adminName,
}: {
  app: ModeratorApplicationData;
  adminName: string;
}) {
  const router = useRouter();
  const toast = useToast();
  const [notes, setNotes] = useState(app.verificationNotes ?? "");
  const [confirm, setConfirm] = useState<"approve" | "reject" | "editable" | null>(null);
  const [busy, setBusy] = useState(false);
  const [current, setCurrent] = useState(app);
  const [error, setError] = useState<string | null>(null);

  const locked = current.status === "approved";

  const decide = async () => {
    if (!confirm) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/moderator-applications/${current.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision: confirm, notes }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error ?? "Алдаа гарлаа.");
      setCurrent(json.data as ModeratorApplicationData);
      toast.success(
        confirm === "approve"
          ? "Анкет зөвшөөрөгдлөө — түгжигдлээ."
          : confirm === "reject"
            ? "Анкет татгалзлаа."
            : "Засуулах хүсэлт илгээлээ."
      );
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Алдаа гарлаа.");
    } finally {
      setBusy(false);
      setConfirm(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button variant="secondary" size="sm" onClick={() => router.push("/admin/moderator-applications")}>
            <ArrowLeft className="h-4 w-4" /> Жагсаалт
          </Button>
          <StatusBadge status={current.status} />
        </div>
        <p className="text-xs text-zinc-400">Хянаж буй админ: {adminName}</p>
      </div>

      {error ? (
        <p className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-600 dark:text-rose-300">{error}</p>
      ) : null}

      {locked ? (
        <p className="flex items-center gap-2 rounded-lg border border-emerald-400/40 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300">
          <Lock className="h-4 w-4" /> Анкет баталгаажсан — цаашид өөрчлөх боломжгүй.
        </p>
      ) : null}

      {/* Хувийн мэдээлэл */}
      <Section icon={<User className="h-4 w-4" />} title="Хувийн мэдээлэл">
        <Row label="Нэр" value={current.fullName} />
        <Row label="Facebook" value={current.facebookLink} link={current.facebookLink} />
        <Row label="Утас" value={current.phoneNumbers.join(", ")} />
      </Section>

      {/* Иргэний үнэмлэх зургууд */}
      <Section icon={<Fingerprint className="h-4 w-4" />} title="Иргэний үнэмлэх — 6 зураг">
        {FRONT_LABELS.map((label, i) => (
          <ThumbStrip key={label} label={label} objectKey={current.idCardFrontUrls[i]} />
        ))}
        {BACK_LABELS.map((label, i) => (
          <ThumbStrip key={label} label={label} objectKey={current.idCardBackUrls[i]} />
        ))}
      </Section>

      {/* Селфи */}
      <Section icon={<ScanFace className="h-4 w-4" />} title="Селфи (амьд нүүр)">
        {current.selfieFaceUrl ? <SecureImage objectKey={current.selfieFaceUrl} label="Селфи" rounded /> : <p className="text-sm text-zinc-400">—</p>}
        <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
          <BadgeL label="Нүүр тааруулах" value={current.faceMatchStatus} />
          <BadgeL label="Баримт скан" value={current.documentScanStatus} />
          <BadgeL label="Нүүр score" value={current.faceMatchScore != null ? `${current.faceMatchScore}/100` : "—"} />
          <BadgeL label="Баримт score" value={current.documentScanScore != null ? `${current.documentScanScore}/100` : "—"} />
        </div>
      </Section>

      {/* Эцэг эх */}
      <Section icon={<Users className="h-4 w-4" />} title="Эцэг эхийн мэдээлэл">
        <Row label="Эцэг" value={`${current.father.name} · ${current.father.phone}`} />
        <Row label="Эцэг Facebook" value={current.father.facebookLink} link={current.father.facebookLink} />
        <Row label="Эх" value={`${current.mother.name} · ${current.mother.phone}`} />
        <Row label="Эх Facebook" value={current.mother.facebookLink} link={current.mother.facebookLink} />
      </Section>

      {/* Банк */}
      <Section icon={<Banknote className="h-4 w-4" />} title="Банкны данс">
        {current.bankAccounts.length === 0 ? (
          <p className="text-sm text-zinc-400">—</p>
        ) : (
          current.bankAccounts.map((b, i) => (
            <Row key={i} label={`Данс ${i + 1}`} value={`${b.bankName}: ${b.accountNumber}`} />
          ))
        )}
      </Section>

      {/* Хаяг */}
      <Section icon={<MapPin className="h-4 w-4" />} title="Гэрийн хаяг / Байршил">
        <Row label="Одоогийн хаяг" value={current.currentAddressMapsLink ?? "—"} link={current.currentAddressMapsLink ?? undefined} maps />
        <Row label="VPN илэрсэн" value={current.vpnDetected ? "Тийм ⚠️" : "Үгүй ✓"} />
        {current.addressHistory.length > 0 ? (
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Хаягийн түүх</p>
            {current.addressHistory.map((h, i) => (
              <p key={i} className="flex items-start justify-between gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                <a
                  href={h.mapsLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="truncate text-[#1877F2] hover:underline dark:text-[#6da3ff]"
                >
                  {h.mapsLink}
                </a>
                <span className="shrink-0">{formatDateTime(h.capturedAt)}</span>
              </p>
            ))}
          </div>
        ) : null}
      </Section>

      {/* Тайлбар + үйлдэл */}
      <Card>
        <CardContent className="space-y-4">
          <Textarea
            label="Admin тайлбар (haalta)"
            placeholder="Засах шаардлага, шалтгаан..."
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            disabled={locked}
          />
          {current.verificationNotes ? (
            <p className="rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3 text-xs text-zinc-600 dark:border-white/10 dark:bg-white/5 dark:text-zinc-300">
              <ShieldCheck className="mr-1 inline h-3.5 w-3.5 text-brand-500" />
              Системийн тэмдэглэл: {current.verificationNotes}
            </p>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => setConfirm("editable")} disabled={locked || busy}>
              <PencilLine className="h-4 w-4" /> Засуулах хүсэлт
            </Button>
            <Button variant="primary" onClick={() => setConfirm("approve")} disabled={locked || busy}>
              <Check className="h-4 w-4" /> Зөвшөөрөх
            </Button>
            <Button variant="danger" onClick={() => setConfirm("reject")} disabled={locked || busy}>
              <X className="h-4 w-4" /> Татгалзах
            </Button>
          </div>
          <p className="text-[11px] text-zinc-400">
            Зөвшөөрсөн үед анкет түгжигдэж, өргөдөл гаргагч цаашид засах боломжгүй болно.
          </p>
        </CardContent>
      </Card>

      <ConfirmDialog
        open={confirm !== null}
        onClose={() => setConfirm(null)}
        onConfirm={decide}
        loading={busy}
        title={
          confirm === "approve" ? "Анкет зөвшөөрөх үү?" :
          confirm === "reject" ? "Анкет татгалзах уу?" :
          "Засуулах хүсэлт илгээх үү?"
        }
        description={
          confirm === "approve"
            ? "Зөвшөөрөхөд анкет баталгаажиж, өргөдөл гаргагч цаашид засах боломжгүй болно."
            : confirm === "reject"
              ? "Анкет татгалзаж, өргөдөл гаргагчид мэдэгдэнэ."
              : "Өргөдөл гаргагч анкетаа засаад дахин илгээх боломжтой болно."
        }
        confirmLabel={confirm === "approve" ? "Зөвшөөрөх" : confirm === "reject" ? "Татгалзах" : "Илгээх"}
        danger={confirm === "reject"}
      />
    </div>
  );
}

/* ---------- Local helpers ---------- */

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-500/10 text-brand-600 dark:text-brand-300">{icon}</span>
          <h3 className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">{title}</h3>
        </div>
        {children}
      </CardContent>
    </Card>
  );
}

function Row({ label, value, link, maps }: { label: string; value: string; link?: string; maps?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-zinc-100 pb-3 last:border-0 dark:border-white/6">
      <span className="text-sm text-zinc-500 dark:text-zinc-400">{label}</span>
      {link ? (
        <a
          href={link}
          target="_blank"
          rel="noopener noreferrer"
          className="flex max-w-[55%] items-center gap-1 truncate text-right text-sm font-medium text-[#1877F2] hover:underline dark:text-[#6da3ff]"
        >
          {value}
          {maps ? <Globe className="h-3.5 w-3.5" /> : null}
        </a>
      ) : (
        <span className="max-w-[55%] break-words text-right text-sm font-medium text-zinc-900 dark:text-white">{value}</span>
      )}
    </div>
  );
}

function BadgeL({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-zinc-200 px-3 py-2 dark:border-white/10">
      <p className="text-[11px] text-zinc-400">{label}</p>
      <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">{value}</p>
    </div>
  );
}

function ThumbStrip({ label, objectKey }: { label: string; objectKey?: string }) {
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-[120px_1fr] sm:items-center">
      <p className="text-xs text-zinc-500 dark:text-zinc-400">{label}</p>
      {objectKey ? <SecureImage objectKey={objectKey} label={label} /> : <p className="text-sm text-zinc-400">—</p>}
    </div>
  );
}

function SecureImage({ objectKey, label, rounded }: { objectKey: string; label: string; rounded?: boolean }) {
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expired, setExpired] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    setExpired(false);
    try {
      const res = await fetch(`/api/r2/download-url?key=${encodeURIComponent(objectKey)}`);
      const json = await res.json();
      if (!json.ok) throw new Error(json.error ?? "URL авахад алдаа гарлаа.");
      setUrl(json.data.url as string);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Алдаа гарлаа.");
    }
  }, [objectKey]);

  useEffect(() => {
    load();
  }, [load]);

  if (error) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-xl border border-rose-500/20 bg-rose-500/5 px-4 py-6 text-center">
        <p className="text-sm text-rose-500">{error}</p>
        <Button size="sm" variant="secondary" onClick={load}>Дахин ачаалах</Button>
      </div>
    );
  }
  if (!url) return <Skeleton className="h-36 w-full rounded-xl" />;
  return (
    <div className="space-y-1.5">
      <img
        src={url}
        alt={label}
        onError={() => setExpired(true)}
        className={
          "w-full border border-zinc-200 bg-zinc-50 object-contain dark:border-white/10 dark:bg-ink-900 " +
          (rounded ? "h-40 rounded-full" : "h-44 rounded-xl")
        }
      />
      {expired ? (
        <Button size="sm" variant="secondary" onClick={load}>Хугацаа дууссан — дахин ачаалах</Button>
      ) : (
        <p className="flex items-center gap-1.5 text-[11px] text-zinc-400">
          <Lock className="h-3 w-3" /> Short-lived signed URL
        </p>
      )}
    </div>
  );
}
