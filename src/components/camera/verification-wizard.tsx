"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  FileCheck2,
  IdCard,
  Lock,
  MapPin,
  ScanFace,
  ShieldCheck,
  Trash2,
  User,
  Wifi,
  WifiOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Stepper, type StepDef } from "@/components/ui/progress";
import { ErrorState, PageLoader } from "@/components/ui/error-state";
import { DocumentCapture } from "@/components/camera/document-capture";
import { FaceCapture } from "@/components/camera/face-capture";
import { useToast } from "@/components/ui/toast";
import { uploadVerificationImage } from "@/lib/client-upload";
import { cn, formatDate } from "@/lib/utils";
import type { FaceCheckResult, Moderator, VerificationRequest } from "@/types";

const STEPS: StepDef[] = [
  { key: "info", label: "Хувийн мэдээлэл" },
  { key: "consent", label: "Зөвшөөрөл" },
  { key: "document", label: "Баримт" },
  { key: "face", label: "Нүүр" },
  { key: "location", label: "Байршил" },
  { key: "review", label: "Хяналт" },
  { key: "done", label: "Дууссан" },
];

type DocumentChoice = "id-card" | "birth-certificate" | null;

interface CaptureResult {
  blob: Blob;
  dataUrl: string;
}

export function VerificationWizard() {
  const router = useRouter();
  const toast = useToast();

  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [moderator, setModerator] = useState<Moderator | null>(null);

  // Хувийн мэдээлэл (step 1)
  const [nickname, setNickname] = useState("");
  const [facebookUrl, setFacebookUrl] = useState("");
  const [phone, setPhone] = useState("");

  // Зөвшөөрөл (step 2)
  const [consentChecked, setConsentChecked] = useState(false);
  const [consentId, setConsentId] = useState<string | null>(null);

  // Баримт (step 3)
  const [documentChoice, setDocumentChoice] = useState<DocumentChoice>(null);
  const [cameraOpen, setCameraOpen] = useState<"document" | "face" | null>(null);
  const [requestId, setRequestId] = useState<string | null>(null);
  const [documentCapture, setDocumentCapture] = useState<CaptureResult | null>(null);
  const [docUploading, setDocUploading] = useState(false);

  // Нүүр (step 4)
  const [faceCapture, setFaceCapture] = useState<CaptureResult | null>(null);
  const [faceResult, setFaceResult] = useState<FaceCheckResult | null>(null);
  const [faceUploading, setFaceUploading] = useState(false);

  // Байршил (step 5)
  const [locationState, setLocationState] = useState<"none" | "sharing" | "verified" | "denied" | "unavailable">("none");
  const [locationConsentId, setLocationConsentId] = useState<string | null>(null);

  // Submit
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [finishedRequest, setFinishedRequest] = useState<VerificationRequest | null>(null);

  /* ---------- Initial load ---------- */
  const loadProfile = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await fetch("/api/profile");
      const json = await res.json();
      if (res.status === 401) {
        router.push("/login?next=/verify");
        return;
      }
      if (!json.ok) {
        if (res.status === 404) {
          setLoadError("MODERATOR_PROFILE_MISSING");
        } else {
          setLoadError(json.error ?? "Профайл ачаалахад алдаа гарлаа.");
        }
        return;
      }
      const mod = json.data as Moderator;
      setModerator(mod);
      setNickname(mod.nickname ?? "");
      setFacebookUrl(mod.facebookUrl ?? "");
      setPhone(mod.phone ?? "");
    } catch {
      setLoadError("Сүлжээний алдаа гарлаа. Интернэт холболтоо шалгана уу.");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  /* ---------- Actions ---------- */

  const startVerificationRequest = async () => {
    if (!consentId || !documentChoice) return;
    const res = await fetch("/api/verifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ documentType: documentChoice, consentId }),
    });
    const json = await res.json();
    if (!json.ok) throw new Error(json.error ?? "Хүсэлт үүсгэхэд алдаа гарлаа.");
    setRequestId(json.data.id as string);
  };

  const handleConsentContinue = async () => {
    try {
      const consentRes = await fetch("/api/consents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ version: "1.0", purpose: "identity_verification" }),
      });
      const consentJson = await consentRes.json();
      if (!consentJson.ok) throw new Error(consentJson.error ?? "Зөвшөөрөл бүртгэхэд алдаа гарлаа.");
      setConsentId(consentJson.data.consentId as string);
      setStep(2);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Алдаа гарлаа. Дахин оролдоно уу.");
    }
  };

  const handleDocumentCaptured = async (capture: CaptureResult) => {
    setCameraOpen(null);
    setDocumentCapture(capture);
    setDocUploading(true);
    try {
      if (!requestId || !documentChoice) throw new Error("Хүсэлт үүсгээгүй байна.");
      await uploadVerificationImage(capture.blob, requestId, documentChoice);
      setStep(3);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Зураг илгээхэд алдаа гарлаа.");
      setDocumentCapture(null);
    } finally {
      setDocUploading(false);
    }
  };

  const handleFaceCaptured = async (result: { blob: Blob; dataUrl: string; faceResult: FaceCheckResult }) => {
    setCameraOpen(null);
    setFaceCapture({ blob: result.blob, dataUrl: result.dataUrl });
    setFaceResult(result.faceResult);
    setFaceUploading(true);
    try {
      if (!requestId) throw new Error("Хүсэлт үүсгээгүй байна.");
      await uploadVerificationImage(result.blob, requestId, "face", result.faceResult);
      setStep(4);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Нүүрний зураг илгээхэд алдаа гарлаа.");
      setFaceCapture(null);
    } finally {
      setFaceUploading(false);
    }
  };

  const shareLocation = async () => {
    setLocationState("sharing");
    try {
      if (!("geolocation" in navigator)) {
        setLocationState("unavailable");
        return;
      }
      const consentRes = await fetch("/api/consents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ version: "1.0", purpose: "location" }),
      });
      const consentJson = await consentRes.json();
      const locConsentId = consentJson.ok ? (consentJson.data.consentId as string) : null;
      setLocationConsentId(locConsentId);

      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: false,
          timeout: 10_000,
          maximumAge: 300_000,
        });
      });

      const res = await fetch("/api/locations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          consentId: locConsentId,
          kind: "identity",
        }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error ?? "Байршил хадгалахад алдаа гарлаа.");
      setLocationState("verified");
      toast.success("Байршил баталгаажлаа (ойролцоо байршил хадгалагдсан).");
    } catch (e) {
      if (e instanceof GeolocationPositionError) {
        setLocationState(e.code === e.PERMISSION_DENIED ? "denied" : "unavailable");
        toast.error(
          e.code === e.PERMISSION_DENIED
            ? "Байршил ашиглах зөвшөөрөл татгалзсан. Үргэлжлүүлэх боломжтой."
            : "Байршил тодорхойлох боломжгүй байна."
        );
      } else {
        setLocationState("unavailable");
        toast.error(e instanceof Error ? e.message : "Байршил хадгалахад алдаа гарлаа.");
      }
    }
  };

  const handleSubmit = async () => {
    if (!requestId) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await fetch(`/api/verifications/${requestId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          locationStatus: locationState === "verified" ? "verified" : locationState === "denied" ? "denied" : locationState === "unavailable" ? "unavailable" : "none",
        }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error ?? "Илгээхэд алдаа гарлаа.");
      setFinishedRequest({ id: requestId } as VerificationRequest);
      setStep(6);
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : "Илгээхэд алдаа гарлаа. Дахин оролдоно уу.");
    } finally {
      setSubmitting(false);
    }
  };

  /* ---------- Render states ---------- */

  if (loading) return <PageLoader label="Профайл ачаалж байна…" />;

  if (loadError === "MODERATOR_PROFILE_MISSING") {
    return (
      <Card className="mx-auto max-w-lg">
        <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/10">
            <User className="h-7 w-7 text-amber-500" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">Moderator профайл олдсонгүй</h2>
            <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
              Баталгаажуулалт хийхийн өмнө moderator болох өргөдлөө өгөх шаардлагатай.
            </p>
          </div>
          <Button onClick={() => router.push("/moderator/apply")}>
            Moderator болох өргөдөл <ArrowRight className="h-4 w-4" />
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (loadError) {
    return <ErrorState title="Ачаалахад алдаа гарлаа" description={loadError} onRetry={loadProfile} />;
  }

  const stepMeta = STEPS[step] ?? STEPS[0]!;

  return (
    <div className="mx-auto max-w-2xl">
      {/* Progress */}
      <div className="mb-8">
        <div className="mb-4 flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
            Алхам {String(step + 1).padStart(2, "0")}/{String(STEPS.length).padStart(2, "0")}
          </p>
          <button
            onClick={() => router.push("/dashboard")}
            className="text-xs font-medium text-zinc-400 transition hover:text-rose-500"
          >
            Цуцлах
          </button>
        </div>
        <Stepper steps={STEPS} currentIndex={step} compact />
        <h1 className="mt-5 text-xl font-bold tracking-tight text-zinc-900 dark:text-white">
          {stepMeta.label}
        </h1>
      </div>

      {/* STEP 1 — Хувийн мэдээлэл */}
      {step === 0 ? (
        <div className="space-y-4 animate-fade-up">
          <Card>
            <CardContent className="space-y-4">
              <div className="rounded-xl bg-brand-500/8 border border-brand-500/15 px-4 py-3 text-sm text-zinc-600 dark:text-zinc-300">
                Таны бүртгэлтэй мэдээлэл. Шаардлагатай бол засаад үргэлжлүүлнэ үү.
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-xl border border-zinc-200/80 bg-white/70 px-4 py-3 dark:border-white/8 dark:bg-white/[0.03]">
                  <p className="text-xs text-zinc-400">Бүтэн нэр</p>
                  <p className="mt-0.5 text-sm font-semibold text-zinc-900 dark:text-white">{moderator?.fullName}</p>
                </div>
                <div className="rounded-xl border border-zinc-200/80 bg-white/70 px-4 py-3 dark:border-white/8 dark:bg-white/[0.03]">
                  <p className="text-xs text-zinc-400">Moderator болсон огноо</p>
                  <p className="mt-0.5 text-sm font-semibold text-zinc-900 dark:text-white">{formatDate(moderator?.becameModeratorAt)}</p>
                </div>
              </div>
              <Input label="Moderator нэр" value={nickname} onChange={(e) => setNickname(e.target.value)} maxLength={40} />
              <Input label="Facebook линк" value={facebookUrl} onChange={(e) => setFacebookUrl(e.target.value)} placeholder="https://facebook.com/…" />
              <Input label="Утасны дугаар" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+976 …" />
            </CardContent>
          </Card>
          <WizardNav
            onBack={() => router.push("/dashboard")}
            onNext={async () => {
              if (!nickname.trim()) {
                toast.error("Moderator нэрээ оруулна уу.");
                return;
              }
              try {
                const res = await fetch("/api/profile", {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ nickname, facebookUrl, phone }),
                });
                const json = await res.json();
                if (!json.ok) throw new Error(json.error ?? "Хадгалахад алдаа гарлаа.");
                setStep(1);
              } catch (e) {
                toast.error(e instanceof Error ? e.message : "Алдаа гарлаа.");
              }
            }}
            nextLabel="Үргэлжлүүлэх"
          />
        </div>
      ) : null}

      {/* STEP 2 — Зөвшөөрөл */}
      {step === 1 ? (
        <div className="space-y-4 animate-fade-up">
          <Card>
            <CardContent className="space-y-5">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-500/10">
                  <ShieldCheck className="h-5 w-5 text-brand-500" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">Баталгаажуулалт хийх зөвшөөрөл</h3>
                  <p className="mt-1 text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
                    Таны оруулсан мэдээлэл нь зөвхөн moderator identity verification зорилгоор ашиглагдана.
                  </p>
                </div>
              </div>

              <div className="space-y-3 rounded-xl border border-zinc-200/80 bg-white/60 p-4 dark:border-white/8 dark:bg-white/[0.03]">
                <InfoRow icon={<FileCheck2 className="h-4 w-4" />} title="Юу цуглуулах вэ?" text="Сонгосон баримтын зураг (иргэний үнэмлэх эсвэл төрсний гэрчилгээ), нүүрний камерын зураг, зөвшөөрсөн тохиолдолд ойролцоо байршил." />
                <InfoRow icon={<Lock className="h-4 w-4" />} title="Яагаад хэрэгтэй вэ?" text="Moderator-ын жинхэнэ эсэхийг баталгаажуулж, нийгэмлэгийн итгэлцлийг хамгаалах зорилготой." />
                <InfoRow icon={<ShieldCheck className="h-4 w-4" />} title="Хэн харах вэ?" text="Зөвхөн эрх бүхий admin-ууд шалгалтын үеэр үзнэ. Нийтэд хэзээ ч харагдахгүй." />
                <InfoRow icon={<Trash2 className="h-4 w-4" />} title="Хэр удаан хадгалах вэ?" text="Retention policy-ийн дагуу хязгаарлагдмал хугацаанд хадгалагдаад автоматаар устгагдана." />
                <InfoRow icon={<Wifi className="h-4 w-4" />} title="Бусад мэдээлэл" text="Баталгаажуулалтын үеэр IP хаяг нь зөвхөн сервер талд, аюулгүй байдлын зорилгоор бүртгэгдэнэ." />
              </div>

              <label
                className={cn(
                  "flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition-all",
                  consentChecked
                    ? "border-brand-500/50 bg-brand-500/8"
                    : "border-zinc-200 dark:border-white/10 hover:border-zinc-300 dark:hover:border-white/20"
                )}
              >
                <input
                  type="checkbox"
                  checked={consentChecked}
                  onChange={(e) => setConsentChecked(e.target.checked)}
                  className="mt-0.5 h-4 w-4 accent-brand-500"
                />
                <span className="text-sm leading-relaxed text-zinc-700 dark:text-zinc-200">
                  Би дээрх мэдээлэлтэй танилцаж, баталгаажуулалт хийхийг зөвшөөрч байна.
                </span>
              </label>
            </CardContent>
          </Card>
          <WizardNav
            onBack={() => setStep(0)}
            onNext={handleConsentContinue}
            nextLabel="Үргэлжлүүлэх"
            nextDisabled={!consentChecked}
            hint={!consentChecked ? "Зөвшөөрөлгүйгээр камер нээгдэхгүй." : undefined}
          />
        </div>
      ) : null}

      {/* STEP 3 — Баримт сонголт + камер */}
      {step === 2 ? (
        documentCapture ? (
          <div className="space-y-4 animate-fade-up">
            <Card>
              <CardContent className="flex flex-col items-center gap-4 py-8 text-center">
                <img src={documentCapture.dataUrl} alt="Авсан баримт" className="max-h-72 w-auto rounded-xl border border-zinc-200 dark:border-white/10" />
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  {docUploading ? "Зургийг аюулгүй илгээж байна…" : "Баримт амжилттай хадгалагдлаа."}
                </p>
                <div className="flex gap-2">
                  <Button variant="secondary" onClick={() => { setDocumentCapture(null); setRequestId(null); }} disabled={docUploading}>
                    Дахин авах
                  </Button>
                  <Button onClick={() => setStep(3)} disabled={docUploading} loading={docUploading}>
                    Үргэлжлүүлэх <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="space-y-4 animate-fade-up">
            <Card>
              <CardContent className="space-y-4">
                <p className="text-sm text-zinc-600 dark:text-zinc-300">
                  Баталгаажуулах баримтаа сонгоно уу. <b>Зөвхөн нэгийг</b> сонгоход хангалттай.
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <DocOption
                    active={documentChoice === "id-card"}
                    title="Иргэний үнэмлэх"
                    subtitle="Хүрээнд бүрэн багтаасан, тод зураг авах"
                    icon={<IdCard className="h-6 w-6" />}
                    onClick={() => {
                      setDocumentChoice("id-card");
                      setRequestId(null);
                      setDocumentCapture(null);
                    }}
                  />
                  <DocOption
                    active={documentChoice === "birth-certificate"}
                    title="Төрсний гэрчилгээ"
                    subtitle="Иргэний үнэмлэхгүй бол энэ баримтыг ашиглана"
                    icon={<FileCheck2 className="h-6 w-6" />}
                    onClick={() => {
                      setDocumentChoice("birth-certificate");
                      setRequestId(null);
                      setDocumentCapture(null);
                    }}
                  />
                </div>
                <p className="text-xs text-zinc-400">
                  Камераар авах боломжгүй үед дахин оролдох боломжтой. Gallery-оос зураг оруулах боломжгүй.
                </p>
              </CardContent>
            </Card>
            <WizardNav
              onBack={() => setStep(1)}
              onNext={async () => {
                if (!documentChoice) {
                  toast.error("Баримтаа сонгоно уу.");
                  return;
                }
                try {
                  if (!requestId) await startVerificationRequest();
                  setCameraOpen("document");
                } catch (e) {
                  toast.error(e instanceof Error ? e.message : "Алдаа гарлаа.");
                }
              }}
              nextLabel="Камер нээх"
            />
          </div>
        )
      ) : null}

      {/* STEP 4 — Нүүр */}
      {step === 3 ? (
        faceCapture ? (
          <div className="space-y-4 animate-fade-up">
            <Card>
              <CardContent className="flex flex-col items-center gap-4 py-8 text-center">
                <img src={faceCapture.dataUrl} alt="Нүүрний зураг" className="h-44 w-44 rounded-full border border-zinc-200 object-cover dark:border-white/10" />
                <div className="space-y-1">
                  <p className="flex items-center justify-center gap-1.5 text-sm font-semibold text-brand-600 dark:text-brand-300">
                    <CheckCircle2 className="h-4 w-4" /> Face verification complete
                  </p>
                  <p className="text-xs text-zinc-400">
                    Liveness: {faceResult?.livenessPassed ? "Амжилттай" : "Шалгагдаагүй"} · Алхам: {faceResult?.checks.stepsCompleted ?? 0}/4
                  </p>
                </div>
                {faceUploading ? <p className="text-sm text-zinc-500">Илгээж байна…</p> : null}
                <div className="flex gap-2">
                  <Button variant="secondary" onClick={() => setFaceCapture(null)} disabled={faceUploading}>
                    Дахин авах
                  </Button>
                  <Button onClick={() => setStep(4)} disabled={faceUploading} loading={faceUploading}>
                    Үргэлжлүүлэх <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="space-y-4 animate-fade-up">
            <Card>
              <CardContent className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-500/10">
                    <ScanFace className="h-5 w-5 text-brand-500" />
                  </div>
                  <div className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
                    <p className="font-semibold text-zinc-900 dark:text-white">Нүүрний баталгаажуулалт</p>
                    <p className="mt-1">
                      Урд камер нээгдэнэ. Нүүрээ хүрээнд байрлуулж, дэлгэцийн зааврыг дагана уу.
                      Liveness шалгалт (толгой эргүүлэх) хийгдэнэ.
                    </p>
                  </div>
                </div>
                <ul className="space-y-2 text-sm text-zinc-500 dark:text-zinc-400">
                  <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-brand-500" /> Гэрэлтэй орчинд байх</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-brand-500" /> Нүдний шил, малгайгаа тайлах</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-brand-500" /> Камерт зөвхөн та нэг хүн харагдах</li>
                </ul>
                <p className="text-xs text-zinc-400">
                  Биометрийн мэдээлэл шаардлагагүйгээр хадгалагдахгүй — зөвхөн admin хяналтад зориулсан камерын зураг.
                </p>
              </CardContent>
            </Card>
            <WizardNav
              onBack={() => setStep(2)}
              onNext={() => setCameraOpen("face")}
              nextLabel="Урд камер нээх"
            />
          </div>
        )
      ) : null}

      {/* STEP 5 — Байршил */}
      {step === 4 ? (
        <div className="space-y-4 animate-fade-up">
          <Card>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-500/10">
                  <MapPin className="h-5 w-5 text-brand-500" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">Байршил ашиглах зөвшөөрөл</h3>
                  <p className="mt-1 text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
                    Таны байршлыг moderator мэдээллийг баталгаажуулах зорилгоор ашиглах уу?
                    Зөвхөн ойролцоо байршил хадгалагдана. Татгалзсан ч баталгаажуулалт үргэлжилнэ.
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-3">
                <Button onClick={shareLocation} loading={locationState === "sharing"} variant="primary">
                  <MapPin className="h-4 w-4" /> Байршил хуваалцах
                </Button>
                <Button variant="ghost" onClick={() => setLocationState("denied")}>
                  Татгалзах
                </Button>
              </div>
              {locationState === "verified" ? (
                <p className="flex items-center gap-2 rounded-xl border border-brand-500/25 bg-brand-500/8 px-4 py-3 text-sm text-brand-700 dark:text-brand-300">
                  <CheckCircle2 className="h-4 w-4" /> Байршил баталгаажлаа — ойролцоо байршил (≈1км нарийвчлалтай) хадгалагдсан.
                </p>
              ) : null}
              {locationState === "denied" ? (
                <p className="rounded-xl border border-zinc-200 px-4 py-3 text-sm text-zinc-500 dark:border-white/10 dark:text-zinc-400">
                  Байршил хуваалцаагүй — таны сонголт, үргэлжлүүлэх боломжтой.
                </p>
              ) : null}
              {locationState === "unavailable" ? (
                <p className="flex items-center gap-2 rounded-xl border border-amber-500/25 bg-amber-500/8 px-4 py-3 text-sm text-amber-700 dark:text-amber-300">
                  <WifiOff className="h-4 w-4" /> Байршил тодорхойлох боломжгүй — үргэлжлүүлэх боломжтой.
                </p>
              ) : null}
            </CardContent>
          </Card>
          <WizardNav onBack={() => setStep(3)} onNext={() => setStep(5)} nextLabel="Хяналт руу" />
        </div>
      ) : null}

      {/* STEP 6 — Review */}
      {step === 5 ? (
        <div className="space-y-4 animate-fade-up">
          <Card>
            <CardContent className="space-y-5">
              <ReviewRow label="Moderator" value={`${moderator?.fullName} (${moderator?.nickname})`} />
              <ReviewRow
                label="Баримт"
                value={documentChoice === "id-card" ? "Иргэний үнэмлэх" : "Төрсний гэрчилгээ"}
              />
              {documentCapture ? (
                <div className="flex items-center gap-3">
                  <img src={documentCapture.dataUrl} alt="Баримт" className="h-20 w-32 rounded-lg border border-zinc-200 object-cover dark:border-white/10" />
                  <p className="text-xs text-zinc-400">Баримтын зураг хадгалагдсан ✓</p>
                </div>
              ) : null}
              <ReviewRow label="Нүүрний шалгалт" value={faceResult?.passed ? "Амжилттай ✓" : "Шалгагдаагүй"} />
              <ReviewRow
                label="Байршил"
                value={
                  locationState === "verified"
                    ? "Баталгаажсан (ойролцоо)"
                    : locationState === "denied"
                      ? "Хуваалцаагүй"
                      : locationState === "unavailable"
                        ? "Боломжгүй"
                        : "Хуваалцаагүй"
                }
              />
              <ReviewRow label="IP бүртгэл" value="Сервер талд автоматаар бүртгэгдэнэ (аюулгүй байдлын зорилгоор)" />
              <div className="rounded-xl border border-zinc-200 bg-white/60 px-4 py-3 text-xs leading-relaxed text-zinc-500 dark:border-white/8 dark:bg-white/[0.03] dark:text-zinc-400">
                Илгээсний дараа admin баг таны мэдээллийг шалгана. Шийдвэрийг dashboard дээрээс харж болно.
                Татгалзсан тохиолдолд шалтгааныг харуулж, дахин оруулах боломж олгоно.
              </div>
              {submitError ? (
                <p className="rounded-xl border border-rose-500/25 bg-rose-500/8 px-4 py-3 text-sm text-rose-600 dark:text-rose-300">
                  {submitError}
                </p>
              ) : null}
            </CardContent>
          </Card>
          <WizardNav
            onBack={() => setStep(4)}
            onNext={handleSubmit}
            nextLabel={submitting ? "Илгээж байна…" : "Баталгаажуулалтад илгээх"}
            nextDisabled={submitting}
          />
        </div>
      ) : null}

      {/* STEP 7 — Дууссан */}
      {step === 6 ? (
        <div className="animate-fade-up">
          <Card>
            <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
              <span className="relative flex h-20 w-20 items-center justify-center">
                <span className="absolute inset-0 rounded-full bg-brand-500/30 animate-pulse-ring" />
                <span className="absolute inset-0 rounded-full bg-brand-500/20 animate-pulse-ring [animation-delay:0.6s]" />
                <CheckCircle2 className="relative h-12 w-12 text-brand-400" />
              </span>
              <h2 className="text-xl font-bold text-zinc-900 dark:text-white">Баталгаажуулалт илгээгдлээ</h2>
              <p className="max-w-sm text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
                Таны хүсэлт admin багийн хяналтад орлоо. Шийдвэр гармагц dashboard дээр status шинэчлэгдэнэ.
              </p>
              <div className="flex gap-3">
                <Button onClick={() => router.push("/dashboard")}>Dashboard руу</Button>
                <Button variant="ghost" onClick={() => router.push("/")}>Нүүр хуудас</Button>
              </div>
              {finishedRequest ? (
                <p className="text-xs text-zinc-400">Хүсэлтийн дугаар: {finishedRequest.id.slice(0, 8)}</p>
              ) : null}
            </CardContent>
          </Card>
        </div>
      ) : null}

      {/* Camera overlays */}
      {cameraOpen === "document" && documentChoice ? (
        <DocumentCapture
          documentLabel={documentChoice === "id-card" ? "Иргэний үнэмлэх" : "Төрсний гэрчилгээ"}
          onCancel={() => setCameraOpen(null)}
          onConfirm={handleDocumentCaptured}
        />
      ) : null}
      {cameraOpen === "face" ? (
        <FaceCapture onCancel={() => setCameraOpen(null)} onComplete={handleFaceCaptured} />
      ) : null}
    </div>
  );
}

/* ---------- Helpers ---------- */

function WizardNav({
  onBack,
  onNext,
  nextLabel,
  nextDisabled,
  hint,
}: {
  onBack: () => void;
  onNext: () => void | Promise<void>;
  nextLabel: string;
  nextDisabled?: boolean;
  hint?: string;
}) {
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="flex w-full items-center gap-3">
        <Button variant="secondary" onClick={onBack} className="shrink-0">
          <ArrowLeft className="h-4 w-4" /> Буцах
        </Button>
        <Button full onClick={onNext} disabled={nextDisabled}>
          {nextLabel} <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
      {hint ? <p className="text-xs text-zinc-400">{hint}</p> : null}
    </div>
  );
}

function InfoRow({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brand-500/10 text-brand-600 dark:text-brand-300">
        {icon}
      </span>
      <div>
        <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">{title}</p>
        <p className="mt-0.5 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">{text}</p>
      </div>
    </div>
  );
}

function DocOption({
  active,
  title,
  subtitle,
  icon,
  onClick,
}: {
  active: boolean;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex flex-col items-start gap-3 rounded-xl border p-4 text-left transition-all duration-200",
        active
          ? "border-brand-500/60 bg-brand-500/8 shadow-glow"
          : "border-zinc-200 hover:border-zinc-300 dark:border-white/10 dark:hover:border-white/20"
      )}
    >
      <span
        className={cn(
          "flex h-11 w-11 items-center justify-center rounded-xl transition-colors",
          active ? "bg-brand-500/15 text-brand-500" : "bg-zinc-100 text-zinc-400 dark:bg-white/8"
        )}
      >
        {icon}
      </span>
      <span>
        <span className="block text-sm font-semibold text-zinc-900 dark:text-white">{title}</span>
        <span className="mt-1 block text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">{subtitle}</span>
      </span>
    </button>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-zinc-100 pb-3 last:border-0 dark:border-white/6">
      <span className="text-sm text-zinc-500 dark:text-zinc-400">{label}</span>
      <span className="max-w-[60%] text-right text-sm font-medium text-zinc-900 dark:text-white">{value}</span>
    </div>
  );
}
