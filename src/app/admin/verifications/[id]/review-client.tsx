"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  BadgeCheck,
  FileCheck2,
  Lock,
  MapPin,
  ScanFace,
  ShieldX,
  Wifi,
  X,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import { formatDateTime } from "@/lib/utils";
import { REJECT_REASON_LABELS, type IpHistoryEntry, type LocationRecord, type RejectReason, type VerificationRequest } from "@/types";

/**
 * Review UI — document зургийг зөвхөн short-lived signed URL-ээр ачаална.
 */
export function ReviewClient({
  request,
  ips,
  locations,
}: {
  request: VerificationRequest;
  ips: IpHistoryEntry[];
  locations: LocationRecord[];
}) {
  const router = useRouter();
  const toast = useToast();
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState<RejectReason>("unclear");
  const [rejectNote, setRejectNote] = useState("");
  const [busy, setBusy] = useState(false);

  const documentDoc = request.documents.find((d) => d.documentType === request.documentType);
  const faceDoc = request.documents.find((d) => d.documentType === "face");

  const decide = useCallback(
    async (decision: "approve" | "reject" | "resubmit", reason?: RejectReason, note?: string) => {
      setBusy(true);
      try {
        const res = await fetch(`/api/admin/verifications/${request.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ decision, reason, note }),
        });
        const json = await res.json();
        if (!json.ok) throw new Error(json.error ?? "Алдаа гарлаа.");
        toast.success(
          decision === "approve" ? "Баталгаажуулалт батлагдлаа ✓" : decision === "reject" ? "Татгалзлаа." : "Дахин оруулах хүсэлт илгээлээ."
        );
        setRejectOpen(false);
        router.refresh();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Алдаа гарлаа.");
      } finally {
        setBusy(false);
      }
    },
    [request.id, router, toast]
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href="/admin/verifications" className="rounded-lg p-2 text-zinc-400 transition hover:bg-black/5 hover:text-zinc-800 dark:hover:bg-white/10 dark:hover:text-white">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-white">
              {request.nickname} — баталгаажуулалт
            </h1>
            <p className="text-xs text-zinc-400">#{request.id.slice(0, 8)} · {formatDateTime(request.createdAt)}</p>
          </div>
        </div>
        <StatusBadge status={request.status} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Left: moderator info */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm uppercase tracking-wider text-zinc-400">Moderator мэдээлэл</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <InfoRow label="Бүтэн нэр" value={request.fullName} />
              <InfoRow label="Moderator нэр" value={request.nickname} />
              <InfoRow label="Баримтын төрөл" value={request.documentType === "id-card" ? "Иргэний үнэмлэх" : "Төрсний гэрчилгээ"} />
              <InfoRow label="Илгээсэн" value={formatDateTime(request.submittedAt ?? request.createdAt)} />
              <InfoRow label="Consent" value={request.consentId ? `Бүртгэгдсэн (#${request.consentId.slice(0, 8)})` : "—"} />
              {request.status === "rejected" ? (
                <div className="rounded-xl border border-rose-500/25 bg-rose-500/8 px-4 py-3">
                  <p className="text-xs font-semibold text-rose-600 dark:text-rose-300">
                    Шалтгаан: {request.rejectReason ? REJECT_REASON_LABELS[request.rejectReason] : "—"}
                  </p>
                  {request.rejectNote ? <p className="mt-1 text-xs text-rose-500/90">{request.rejectNote}</p> : null}
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm uppercase tracking-wider text-zinc-400">
                <MapPin className="h-4 w-4" /> Байршил (зөвхөн admin)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {locations.length === 0 ? (
                <p className="text-xs text-zinc-400">Байршлын бүртгэл алга.</p>
              ) : (
                locations.slice(0, 3).map((l) => (
                  <div key={l.id} className="rounded-lg bg-zinc-100/70 px-3 py-2 text-xs dark:bg-white/[0.04]">
                    <p className="font-medium text-zinc-700 dark:text-zinc-200">
                      {l.latitude?.toFixed(2)}, {l.longitude?.toFixed(2)}
                      <span className="ml-2 font-normal text-zinc-400">(ойролцоо ±1км)</span>
                    </p>
                    <p className="mt-0.5 text-zinc-400">
                      {formatDateTime(l.createdAt)} · accuracy {l.accuracy ? `${Math.round(l.accuracy)}м` : "—"}
                    </p>
                  </div>
                ))
              )}
              <p className="flex items-center gap-1.5 text-[11px] text-zinc-400">
                <Lock className="h-3 w-3" /> Нийтэд харагдахгүй — зөвхөн эрх бүхий admin.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Middle: documents */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm uppercase tracking-wider text-zinc-400">
                <FileCheck2 className="h-4 w-4" /> {request.documentType === "id-card" ? "Иргэний үнэмлэх" : "Төрсний гэрчилгээ"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {documentDoc ? (
                <SecureImage objectKey={documentDoc.objectKey} label="Баримтын зураг" />
              ) : (
                <p className="text-sm text-zinc-400">Баримт оруулаагүй байна.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm uppercase tracking-wider text-zinc-400">
                <ScanFace className="h-4 w-4" /> Нүүрний шалгалт
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {faceDoc ? (
                <SecureImage objectKey={faceDoc.objectKey} label="Нүүрний зураг" rounded />
              ) : (
                <p className="text-sm text-zinc-400">Нүүрний зураг оруулаагүй байна.</p>
              )}
              {request.faceResult ? (
                <div className="rounded-xl border border-zinc-200 p-3 text-xs dark:border-white/10">
                  <p className="flex items-center justify-between">
                    <span className="text-zinc-500 dark:text-zinc-400">Liveness</span>
                    <Badge tone={request.faceResult.livenessPassed ? "brand" : "warning"}>
                      {request.faceResult.livenessPassed ? "Амжилттай" : "Шалгагдаагүй"}
                    </Badge>
                  </p>
                  <p className="mt-1.5 flex items-center justify-between">
                    <span className="text-zinc-500 dark:text-zinc-400">Алхамууд</span>
                    <span className="font-medium text-zinc-700 dark:text-zinc-200">
                      {request.faceResult.checks.stepsCompleted}/4
                    </span>
                  </p>
                  <p className="mt-1.5 flex items-center justify-between">
                    <span className="text-zinc-500 dark:text-zinc-400">Гэрэлтүүлэг</span>
                    <span className="font-medium text-zinc-700 dark:text-zinc-200">
                      {request.faceResult.checks.lightingOk ? "OK" : "Бага"}
                    </span>
                  </p>
                  {request.faceResult.note ? (
                    <p className="mt-2 rounded-lg bg-amber-500/10 px-2.5 py-1.5 text-amber-700 dark:text-amber-300">
                      {request.faceResult.note}
                    </p>
                  ) : null}
                  <p className="mt-2 text-[11px] text-zinc-400">
                    Зөвхөн face detection/liveness — биометрийн identity matching биш.
                  </p>
                </div>
              ) : null}
            </CardContent>
          </Card>
        </div>

        {/* Right: IP + actions */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm uppercase tracking-wider text-zinc-400">
                <Wifi className="h-4 w-4" /> IP түүх (зөвхөн admin)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2.5">
              {ips.length === 0 ? (
                <p className="text-xs text-zinc-400">IP бүртгэл алга.</p>
              ) : (
                ips.slice(0, 5).map((ip) => (
                  <div key={ip.id} className="flex items-center justify-between rounded-lg bg-zinc-100/70 px-3 py-2 text-xs dark:bg-white/[0.04]">
                    <span className="font-mono text-zinc-600 dark:text-zinc-300">{ip.ip}</span>
                    <span className="text-zinc-400">{formatDateTime(ip.createdAt)}</span>
                  </div>
                ))
              )}
              <p className="flex items-center gap-1.5 text-[11px] text-zinc-400">
                <Lock className="h-3 w-3" /> Нийтэд хэзээ ч харагдахгүй.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm uppercase tracking-wider text-zinc-400">Шийдвэр</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2.5">
              {request.status === "pending" ? (
                <>
                  <Button full onClick={() => decide("approve")} loading={busy} disabled={busy}>
                    <BadgeCheck className="h-4 w-4" /> Approve
                  </Button>
                  <Button full variant="danger" onClick={() => setRejectOpen(true)} disabled={busy}>
                    <ShieldX className="h-4 w-4" /> Reject
                  </Button>
                  <Button full variant="secondary" onClick={() => decide("resubmit", undefined)} disabled={busy}>
                    <X className="h-4 w-4" /> Дахин оруулах хүсэх
                  </Button>
                </>
              ) : (
                <p className="text-sm text-zinc-400">
                  Шийдвэр гаргагдсан: <StatusBadge status={request.status} />
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Reject dialog */}
      <Dialog
        open={rejectOpen}
        onClose={() => setRejectOpen(false)}
        title="Татгалзах шалтгаан"
        description="Шалтгааныг сонгож, шаардлагатай бол тайлбар нэмнэ үү. Хэрэглэгчид энэ мэдээлэл харагдана."
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setRejectOpen(false)} disabled={busy}>
              Болих
            </Button>
            <Button variant="danger" loading={busy} onClick={() => decide("reject", rejectReason, rejectNote || undefined)}>
              Татгалзах
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="space-y-2">
            {(Object.keys(REJECT_REASON_LABELS) as RejectReason[]).map((r) => (
              <label
                key={r}
                className={
                  "flex cursor-pointer items-center gap-2.5 rounded-lg border px-3.5 py-2.5 text-sm transition " +
                  (rejectReason === r
                    ? "border-rose-500/50 bg-rose-500/8 text-rose-700 dark:text-rose-300"
                    : "border-zinc-200 text-zinc-700 dark:border-white/10 dark:text-zinc-200")
                }
              >
                <input
                  type="radio"
                  name="reject-reason"
                  checked={rejectReason === r}
                  onChange={() => setRejectReason(r)}
                  className="accent-rose-500"
                />
                {REJECT_REASON_LABELS[r]}
              </label>
            ))}
          </div>
          <Textarea
            label="Тайлбар (заавал биш)"
            placeholder="Дэлгэрэнгүй тайлбар…"
            value={rejectNote}
            onChange={(e) => setRejectNote(e.target.value)}
          />
        </div>
      </Dialog>
    </div>
  );
}

/** Signed URL-ээр ачаалах secure image — permanent public URL байхгүй */
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
      <div className="flex flex-col items-center gap-2 rounded-xl border border-rose-500/20 bg-rose-500/5 px-4 py-8 text-center">
        <p className="text-sm text-rose-500">{error}</p>
        <Button size="sm" variant="secondary" onClick={load}>Дахин ачаалах</Button>
      </div>
    );
  }

  if (!url) {
    return <Skeleton className="h-48 w-full rounded-xl" />;
  }

  return (
    <div className="space-y-2">
      <img
        src={url}
        alt={label}
        onError={() => setExpired(true)}
        className={
          "w-full border border-zinc-200 bg-zinc-50 object-contain dark:border-white/10 dark:bg-ink-900 " +
          (rounded ? "h-48 rounded-full" : "h-56 rounded-xl")
        }
      />
      <p className="flex items-center gap-1.5 text-[11px] text-zinc-400">
        <Lock className="h-3 w-3" /> Short-lived signed URL · 2 минутын дараа хүчингүй болно
      </p>
      {expired ? (
        <Button size="sm" variant="secondary" onClick={load}>
          Хугацаа дууссан — дахин ачаалах
        </Button>
      ) : null}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="text-zinc-400">{label}</span>
      <span className="text-right font-medium text-zinc-800 dark:text-zinc-200">{value}</span>
    </div>
  );
}
