"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Banknote,
  CheckCircle2,
  Fingerprint,
  Globe,
  Loader2,
  MapPin,
  Phone,
  Plus,
  ScanFace,
  ShieldCheck,
  Trash2,
  User,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Stepper, type StepDef } from "@/components/ui/progress";
import { useToast } from "@/components/ui/toast";
import { DocumentCapture } from "@/components/camera/document-capture";
import { FaceCapture } from "@/components/camera/face-capture";
import { uploadApplicationImage } from "@/lib/client-upload";
import { cn } from "@/lib/utils";
import type {
  ApplyWizardData,
  FaceCheckResult,
  ParentInfo,
} from "@/types";

const SELFIE_SLOT = "selfie" as const;
const FRONT_SLOTS = ["id-front-0", "id-front-1", "id-front-2"] as const;
const BACK_SLOTS = ["id-back-0", "id-back-1", "id-back-2"] as const;
type ImgSlot = typeof FRONT_SLOTS[number] | typeof BACK_SLOTS[number] | typeof SELFIE_SLOT;

const STEPS: StepDef[] = [
  { key: "info", label: "Хувийн мэдээлэл" },
  { key: "phone", label: "Утас" },
  { key: "idcard", label: "Иргэний үнэмлэх" },
  { key: "selfie", label: "Селфи" },
  { key: "parents", label: "Эцэг эх" },
  { key: "bank", label: "Банк" },
  { key: "address", label: "Хаяг" },
  { key: "review", label: "Хяналт" },
  { key: "done", label: "Дууссан" },
];

const SLOT_LABELS: Record<ImgSlot, string> = {
  "id-front-0": "Иргэний үнэмлэх урд (шууд)",
  "id-front-1": "Иргэний үнэмлэх урд (баруун өнцөг)",
  "id-front-2": "Иргэний үнэмлэх урд (зүүн өнцөг)",
  "id-back-0": "Иргэний үнэмлэх ард (шууд)",
  "id-back-1": "Иргэний үнэмлэх ард (баруун өнцөг)",
  "id-back-2": "Иргэний үнэмлэх ард (зүүн өнцөг)",
  selfie: "Селфи (амьд нүүр)",
};

export function ApplyWizard({
  applicationId,
  initial,
  editable = false,
  lockedReason,
}: {
  applicationId: string;
  initial: ApplyWizardData;
  /** Admin засуулах хүсэлт илгээсэн бол true — дахин илгээх горим */
  editable?: boolean;
  lockedReason?: string | null;
}) {
  const router = useRouter();
  const toast = useToast();
  const [step, setStep] = useState(0);
  const [editableMode] = useState(editable);

  // Step 1 — хувийн мэдээлэл
  const [fullName, setFullName] = useState(initial.fullName);
  const [facebookLink, setFacebookLink] = useState(initial.facebookLink);

  // Step 2 — утас
  const [phones, setPhones] = useState<string[]>(
    initial.phoneNumbers.length > 0 ? initial.phoneNumbers : [""]
  );

  // Step 3/4 — зураг
  const [frontUrls, setFrontUrls] = useState<string[]>(initial.idCardFrontUrls);
  const [backUrls, setBackUrls] = useState<string[]>(initial.idCardBackUrls);
  const [selfieUrl, setSelfieUrl] = useState<string | null>(initial.selfieFaceUrl);
  const [cameraOpen, setCameraOpen] = useState<{ kind: "document" | "selfie"; slot?: ImgSlot } | null>(null);
  const [uploading, setUploading] = useState(false);

  // Step 5 — эцэг эх
  const [father, setFather] = useState<ParentInfo>(initial.father);
  const [mother, setMother] = useState<ParentInfo>(initial.mother);

  // Step 6 — банк
  const [banks, setBanks] = useState(initial.bankAccounts);

  // Step 7 — хаяг
  const [mapsLink, setMapsLink] = useState<string | null>(initial.currentAddressMapsLink);
  const [vpnDetected, setVpnDetected] = useState(initial.vpnDetected);
  const [locating, setLocating] = useState(false);

  // Step 8 — submit
  const [submitting, setSubmitting] = useState(false);
  const [finished, setFinished] = useState(false);

  /* ---------- Validation per step ---------- */
  const infoOk = fullName.trim().length > 0 && facebookLink.trim().length > 0;
  const phonesValid = useMemo(
    () => phones.every((p) => /^[0-9]{8}$|^[+]?[0-9]{8,15}$/.test(p.trim())),
    [phones]
  );
  const phonesOk = phonesValid && phones.every((p) => p.trim().length > 0);
  const frontOk = useMemo(() => FRONT_SLOTS.every((_, i) => (frontUrls[i] ?? "").length > 0), [frontUrls]);
  const backOk = useMemo(() => BACK_SLOTS.every((_, i) => (backUrls[i] ?? "").length > 0), [backUrls]);
  const idOk = frontOk && backOk;
  const selfieOk = !!selfieUrl;
  const parentsOk =
    father.name.trim().length > 0 && father.phone.trim().length > 0 && father.facebookLink.trim().length > 0 &&
    mother.name.trim().length > 0 && mother.phone.trim().length > 0 && mother.facebookLink.trim().length > 0;
  const bankOk = banks.length > 0 && banks.every((b) => b.bankName.trim().length > 0 && /^[0-9]{6,20}$/.test(b.accountNumber.trim()));
  const addressOk = !!mapsLink;

  /* ---------- Image slots ---------- */
  const setSlot = (slot: ImgSlot, url: string) => {
    if (slot === SELFIE_SLOT) {
      setSelfieUrl(url);
      return;
    }
    if (FRONT_SLOTS.includes(slot as never)) {
      const idx = FRONT_SLOTS.indexOf(slot as (typeof FRONT_SLOTS)[number]);
      setFrontUrls((prev) => {
        const next = [...prev];
        next[idx] = url;
        return next;
      });
    } else {
      const idx = BACK_SLOTS.indexOf(slot as (typeof BACK_SLOTS)[number]);
      setBackUrls((prev) => {
        const next = [...prev];
        next[idx] = url;
        return next;
      });
    }
  };

  const getSlotUrl = (slot: ImgSlot): string | null => {
    if (slot === SELFIE_SLOT) return selfieUrl;
    if (FRONT_SLOTS.includes(slot as never)) return frontUrls[FRONT_SLOTS.indexOf(slot as (typeof FRONT_SLOTS)[number])] ?? null;
    return backUrls[BACK_SLOTS.indexOf(slot as (typeof BACK_SLOTS)[number])] ?? null;
  };

  /* ---------- Camera handlers ---------- */
  const handleDocumentConfirm = async (capture: { blob: Blob; dataUrl: string }) => {
    const slot = cameraOpen?.slot;
    if (!slot || slot === SELFIE_SLOT) return;
    setCameraOpen(null);
    setUploading(true);
    try {
      const key = await uploadApplicationImage(capture.blob, applicationId, slot);
      setSlot(slot, key);
      toast.success("Зураг амжилттай авагдлаа.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Зураг авахад алдаа гарлаа.");
    } finally {
      setUploading(false);
    }
  };

  const handleSelfieComplete = async (result: { blob: Blob; dataUrl: string; faceResult: FaceCheckResult }) => {
    setCameraOpen(null);
    setUploading(true);
    try {
      const key = await uploadApplicationImage(result.blob, applicationId, SELFIE_SLOT);
      setSlot(SELFIE_SLOT, key);
      toast.success("Селфи амжилттай авагдлаа.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Селфи авахад алдаа гарлаа.");
    } finally {
      setUploading(false);
    }
  };

  /* ---------- Address / geolocation ---------- */
  const captureLocation = async () => {
    setLocating(true);
    try {
      // 1) VPN шалгалт — хаяг авахын өмнө ЗААВАЛ
      const vpnRes = await fetch("/api/apply/vpn-check", { method: "POST" });
      const vpnJson = await vpnRes.json();
      if (!vpnJson.ok) {
        toast.error(vpnJson.error ?? "VPN шалгалт хийхэд алдаа гарлаа.");
        setLocating(false);
        return;
      }
      const vpn = vpnJson.data as { detected: boolean; score: number };
      if (vpn.detected) {
        setVpnDetected(true);
        setLocating(false);
        toast.error("VPN/прокси илэрлээ. VPN-ээ унтраагаад дахин оролдоно уу.");
        return;
      }
      setVpnDetected(false);

      // 2) Browser Geolocation
      if (!navigator.geolocation) {
        toast.error("GPS/Wi-Fi байршил тодорхойлох боломжгүй байна. GPS-ээ асаагаад дахин оролдоно уу.");
        setLocating(false);
        return;
      }
      const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 0,
        });
      });
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      const link = `https://www.google.com/maps?q=${lat.toFixed(6)},${lng.toFixed(6)}`;
      setMapsLink(link);
      toast.success("Байршил амжилттай авлаа.");
    } catch (e) {
      const code = (e as GeolocationPositionError | null)?.code;
      if (code === 1) toast.error("Байршил ашиглах зөвшөөрөл татгалзсан байна. Зөвшөөрөл өгөөд дахин оролдоно уу.");
      else if (code === 3) toast.error("Байршил авах хугацаа дууссан. Дахин оролдоно уу.");
      else toast.error("Байршил тодорхойлох боломжгүй байна. Сүлжээгээ шалгаад дахин оролдоно уу.");
    } finally {
      setLocating(false);
    }
  };

  /* ---------- Submit ---------- */
  const submit = async () => {
    if (!idOk || !selfieOk) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/apply/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: fullName.trim(),
          facebookLink: facebookLink.trim(),
          phoneNumbers: phones.map((p) => p.trim()).filter(Boolean),
          idCardFrontUrls: frontUrls.filter(Boolean),
          idCardBackUrls: backUrls.filter(Boolean),
          selfieFaceUrl: selfieUrl,
          father,
          mother,
          bankAccounts: banks.map((b) => ({ bankName: b.bankName.trim(), accountNumber: b.accountNumber.trim() })),
          address: {
            mapsLink,
            latitude: mapsLink ? parseMapsLat(mapsLink) : 0,
            longitude: mapsLink ? parseMapsLng(mapsLink) : 0,
            vpnCheck: { detected: vpnDetected, score: vpnDetected ? 100 : 0 },
          },
        }),
      });
      const json = await res.json();
      if (!json.ok) {
        toast.error(json.error ?? "Анкет илгээхэд алдаа гарлаа.");
        return;
      }
      setFinished(true);
      setStep(STEPS.length - 1);
      toast.success("Анкет илгээгдлээ. Admin хяналтыг хүлээнэ үү.");
    } catch {
      toast.error("Сүлжээний алдаа гарлаа. Дахин оролдоно уу.");
    } finally {
      setSubmitting(false);
    }
  };

  const next = () => {
    if (step === 0 && !infoOk) return toast.error("Нэр, Facebook линкээ оруулна уу.");
    if (step === 1 && !phonesOk) return toast.error("Утасны дугаараа зөв оруулна уу (дор хаяж нэг).");
    if (step === 2 && !idOk) return toast.error("6 үнэмлэхийн зургийг бүгдийг нь авах шаардлагатай.");
    if (step === 3 && !selfieOk) return toast.error("Селфи авах шаардлагатай.");
    if (step === 4 && !parentsOk) return toast.error("Эцэг, эхийн бүх мэдээллийг бөглөнө үү.");
    if (step === 5 && !bankOk) return toast.error("Хамгийн багадаа 1 данс зөв оруулна уу.");
    if (step === 6 && !addressOk) return toast.error("Хаягаа (байршлаа) авах шаардлагатай.");
    if (step === 7) {
      submit();
      return;
    }
    setStep((s) => s + 1);
  };

  if (lockedReason) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
          <ShieldCheck className="h-12 w-12 text-emerald-500" />
          <div>
            <p className="text-lg font-semibold text-zinc-900 dark:text-white">Анкет баталгаажсан</p>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">Таны анкет хянагдаж, баталгаажсан тул цаашид өөрчлөх боломжгүй.</p>
            {lockedReason ? <p className="mt-2 text-xs text-zinc-400">{lockedReason}</p> : null}
          </div>
          <Button variant="secondary" onClick={() => router.push("/dashboard")}>Буцах</Button>
        </CardContent>
      </Card>
    );
  }

  if (finished) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
          <CheckCircle2 className="h-12 w-12 text-brand-500" />
          <div>
            <p className="text-lg font-semibold text-zinc-900 dark:text-white">Анкет илгээгдлээ</p>
            <p className="mx-auto mt-1 max-w-sm text-sm text-zinc-500 dark:text-zinc-400">
              Таны анкет admin хяналтад илгээгдлээ. Хяналт хийгдэж дууссаны дараа мэдэгдэл хүлээн авна.
            </p>
          </div>
          <Button variant="secondary" onClick={() => router.push("/dashboard")}>Хянах самбар руу</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {editableMode ? (
        <p className="rounded-xl border border-amber-400/40 bg-amber-400/10 px-4 py-3 text-sm text-amber-700 dark:text-amber-300">
          ⌛ Admin таны анкетыг засах хүсэлтийг илгээсэн. Мэдээллээ засаад дахин илгээнэ үү.
        </p>
      ) : null}

      <Stepper steps={STEPS} currentIndex={step} />

      {/* STEP 0 — Хувийн мэдээлэл */}
      {step === 0 ? (
        <Card>
          <CardContent className="space-y-4">
            <StepHeader icon={<User className="h-5 w-5" />} title="Хувийн мэдээлэл" subtitle="Таны үндсэн мэдээлэл" />
            <Input label="Бүтэн нэр" placeholder="Овог Нэр" value={fullName} onChange={(e) => setFullName(e.target.value)} />
            <Input
              label="Facebook холбоос"
              placeholder="https://facebook.com/yourname"
              value={facebookLink}
              onChange={(e) => setFacebookLink(e.target.value)}
            />
            <WizardNav onBack={() => router.push("/dashboard")} onNext={next} nextLabel="Үргэлжлүүлэх" nextDisabled={!infoOk} />
          </CardContent>
        </Card>
      ) : null}

      {/* STEP 1 — Утас */}
      {step === 1 ? (
        <Card>
          <CardContent className="space-y-4">
            <StepHeader icon={<Phone className="h-5 w-5" />} title="Утасны дугаар" subtitle="Үндсэн дугаар + нэмэлт (хамгийн ихдээ 2)" />
            {phones.map((p, i) => (
              <div key={i} className="flex items-end gap-2">
                <div className="flex-1">
                  <Input
                    label={i === 0 ? "Үндсэн утасны дугаар" : `Нэмэлт утас ${i}`}
                    placeholder="99112233"
                    value={p}
                    inputMode="numeric"
                    onChange={(e) => setPhones((prev) => prev.map((x, j) => (j === i ? e.target.value : x)))}
                  />
                </div>
                {i > 0 ? (
                  <Button variant="ghost" size="sm" className="h-11 w-11 px-0" onClick={() => setPhones((prev) => prev.filter((_, j) => j !== i))} aria-label="Устгах">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                ) : null}
              </div>
            ))}
            {phones.length < 3 ? (
              <Button variant="secondary" size="sm" onClick={() => setPhones((prev) => [...prev, ""])}>
                <Plus className="h-4 w-4" /> Утас нэмэх
              </Button>
            ) : null}
            <WizardNav onBack={() => setStep(0)} onNext={next} nextLabel="Үргэлжлүүлэх" nextDisabled={!phonesOk} />
          </CardContent>
        </Card>
      ) : null}

      {/* STEP 2 — Иргэний үнэмлэх (6 зураг) */}
      {step === 2 ? (
        <Card>
          <CardContent className="space-y-4">
            <StepHeader icon={<Fingerprint className="h-5 w-5" />} title="Иргэний үнэмлэхний зураг" subtitle="Урд талын 3 + ар талын 3 — бүгд заавал" />
            <SlotGrid title="Урд тал (3 өнцөг)" slots={FRONT_SLOTS} urls={frontUrls} onTake={(slot) => setCameraOpen({ kind: "document", slot })} onRetake={(slot) => setCameraOpen({ kind: "document", slot })} />
            <SlotGrid title="Ар тал (3 өнцөг)" slots={BACK_SLOTS} urls={backUrls} onTake={(slot) => setCameraOpen({ kind: "document", slot })} onRetake={(slot) => setCameraOpen({ kind: "document", slot })} />
            <WizardNav onBack={() => setStep(1)} onNext={next} nextLabel="Үргэлжлүүлэх" nextDisabled={!idOk} hint={idOk ? "Бүх 6 зураг авсан ✓" : "6 зургийг бүгдийг нь авах шаардлагатай"} />
          </CardContent>
        </Card>
      ) : null}

      {/* STEP 3 — Селфи */}
      {step === 3 ? (
        <Card>
          <CardContent className="space-y-4">
            <StepHeader icon={<ScanFace className="h-5 w-5" />} title="Селфи (амьд нүүр)" subtitle="Liveness шалгалтыг давах" />
            {selfieUrl ? (
              <div className="flex flex-col items-center gap-4 py-4 text-center">
                <img src={selfieUrl} alt="Селфи" className="h-44 w-44 rounded-full border border-zinc-200 object-cover dark:border-white/10" />
                <Button full onClick={() => setCameraOpen({ kind: "selfie" })}>Дахин авах</Button>
              </div>
            ) : (
              <Button full onClick={() => setCameraOpen({ kind: "selfie" })}>
                <ScanFace className="h-4 w-4" /> Селфи авах
              </Button>
            )}
            <WizardNav onBack={() => setStep(2)} onNext={next} nextLabel="Үргэлжлүүлэх" nextDisabled={!selfieOk} />
          </CardContent>
        </Card>
      ) : null}

      {/* STEP 4 — Эцэг эх */}
      {step === 4 ? (
        <Card>
          <CardContent className="space-y-5">
            <StepHeader icon={<Users className="h-5 w-5" />} title="Эцэг эхийн мэдээлэл" subtitle="Бүх талбар заавал" />
            <ParentGroup label="Эцэг" value={father} onChange={setFather} />
            <ParentGroup label="Эх" value={mother} onChange={setMother} />
            <WizardNav onBack={() => setStep(3)} onNext={next} nextLabel="Үргэлжлүүлэх" nextDisabled={!parentsOk} />
          </CardContent>
        </Card>
      ) : null}

      {/* STEP 5 — Банк */}
      {step === 5 ? (
        <Card>
          <CardContent className="space-y-4">
            <StepHeader icon={<Banknote className="h-5 w-5" />} title="Банкны данс" subtitle="Цалин/комисс авах данс — нэмэх/хасах" />
            {banks.map((b, i) => (
              <div key={i} className="space-y-2 rounded-lg border border-zinc-200 p-3 dark:border-white/10">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Данс {i + 1}</p>
                  <Button variant="ghost" size="sm" onClick={() => setBanks((prev) => prev.filter((_, j) => j !== i))}>
                    <Trash2 className="h-4 w-4" /> Устгах
                  </Button>
                </div>
                <Input label="Банкны нэр" placeholder="Голомт банк" value={b.bankName} onChange={(e) => setBanks((prev) => prev.map((x, j) => (j === i ? { ...x, bankName: e.target.value } : x)))} />
                <Input label="Дансны дугаар" placeholder="1234567890" inputMode="numeric" value={b.accountNumber} onChange={(e) => setBanks((prev) => prev.map((x, j) => (j === i ? { ...x, accountNumber: e.target.value } : x)))} />
              </div>
            ))}
            <Button variant="secondary" size="sm" onClick={() => setBanks((prev) => [...prev, { bankName: "", accountNumber: "" }])}>
              <Plus className="h-4 w-4" /> Данс нэмэх
            </Button>
            <WizardNav onBack={() => setStep(4)} onNext={next} nextLabel="Үргэлжлүүлэх" nextDisabled={!bankOk} />
          </CardContent>
        </Card>
      ) : null}

      {/* STEP 6 — Хаяг */}
      {step === 6 ? (
        <Card>
          <CardContent className="space-y-4">
            <StepHeader icon={<MapPin className="h-5 w-5" />} title="Гэрийн хаяг / Байршил" subtitle="VPN/прокси MЭДЭГДСЭН тохиолдолд хаяг авахыг хориглоно" />
            {vpnDetected ? (
              <p className="rounded-lg border border-rose-400/40 bg-rose-400/10 px-4 py-3 text-sm text-rose-600 dark:text-rose-300">
                ⚠️ VPN/прокси илэрлээ. VPN-ээ унтраагаад дахин оролдоно уу.
              </p>
            ) : null}
            {mapsLink ? (
              <div className="flex items-center justify-between gap-3 rounded-lg border border-emerald-400/40 bg-emerald-400/10 px-4 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">Байршил авсан ✓</p>
                  <p className="truncate text-xs text-zinc-400">{mapsLink}</p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setMapsLink(null)}>Дахин авах</Button>
              </div>
            ) : (
              <Button full onClick={captureLocation} loading={locating}>
                <Globe className="h-4 w-4" /> Байршил авах (GPS)
              </Button>
            )}
            <WizardNav onBack={() => setStep(5)} onNext={next} nextLabel="Хяналт руу" nextDisabled={!addressOk} />
          </CardContent>
        </Card>
      ) : null}

      {/* STEP 7 — Хяналт */}
      {step === 7 ? (
        <Card>
          <CardContent className="space-y-4">
            <StepHeader icon={<CheckCircle2 className="h-5 w-5" />} title="Хяналт" subtitle="Илгээхээс өмнө бүх мэдээллээ шалгана уу" />
            <div className="space-y-1 rounded-xl border border-zinc-200 p-4 dark:border-white/10">
              <ReviewRow label="Нэр" value={fullName} />
              <ReviewRow label="Facebook" value={facebookLink} />
              <ReviewRow label="Утас" value={phones.filter(Boolean).join(", ")} />
              <ReviewRow label="Иргэний үнэмлэх зураг" value={idOk ? "6/6 ✓" : "Бүрэн биш"} />
              <ReviewRow label="Селфи" value={selfieOk ? "✓" : "—"} />
              <ReviewRow label="Эцэг" value={`${father.name} · ${father.phone}`} />
              <ReviewRow label="Эх" value={`${mother.name} · ${mother.phone}`} />
              <ReviewRow label="Банк" value={banks.map((b) => `${b.bankName}: ${b.accountNumber}`).join(", ")} />
              <ReviewRow label="Хаяг" value={mapsLink ?? "—"} />
              <ReviewRow label="VPN" value={vpnDetected ? "Илэрсэн ⚠️" : "Илрээгүй ✓"} />
            </div>
            <WizardNav onBack={() => setStep(6)} onNext={next} nextLabel={submitting ? "Илгээж байна…" : editableMode ? "Дахин илгээх" : "Анкетыг илгээх"} nextDisabled={submitting} />
            {submitting ? <p className="text-center text-xs text-zinc-400"><Loader2 className="mr-1 inline h-3 w-3 animate-spin" />Илгээж байна…</p> : null}
          </CardContent>
        </Card>
      ) : null}

      {/* Camera overlays */}
      {cameraOpen?.kind === "document" && cameraOpen.slot ? (
        <DocumentCapture
          documentLabel={SLOT_LABELS[cameraOpen.slot]}
          onCancel={() => setCameraOpen(null)}
          onConfirm={(cap) => handleDocumentConfirm(cap)}
        />
      ) : null}
      {cameraOpen?.kind === "selfie" ? (
        <FaceCapture onCancel={() => setCameraOpen(null)} onComplete={handleSelfieComplete} />
      ) : null}
      {uploading ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="flex items-center gap-3 rounded-xl bg-white px-6 py-4 text-sm font-medium text-zinc-700 dark:bg-ink-800 dark:text-zinc-200">
            <Loader2 className="h-5 w-5 animate-spin" /> Илгээж байна…
          </div>
        </div>
      ) : null}
    </div>
  );
}

/* ---------- Local helpers ---------- */

function StepHeader({ icon, title, subtitle }: { icon: React.ReactNode; title: string; subtitle: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-500/10 text-brand-600 dark:text-brand-300">
        {icon}
      </span>
      <div>
        <p className="text-base font-semibold text-zinc-900 dark:text-white">{title}</p>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">{subtitle}</p>
      </div>
    </div>
  );
}

function SlotGrid({
  title,
  slots,
  urls,
  onTake,
  onRetake,
}: {
  title: string;
  slots: readonly ImgSlot[];
  urls: string[];
  onTake: (slot: ImgSlot) => void;
  onRetake: (slot: ImgSlot) => void;
}) {
  return (
    <div>
      <p className="mb-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">{title}</p>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        {slots.map((slot, i) => {
          const url = urls[i] ?? "";
          return (
            <button
              key={slot}
              onClick={() => (url ? onRetake(slot) : onTake(slot))}
              className={cn(
                "relative flex aspect-[3/2] items-center justify-center overflow-hidden rounded-xl border transition-all",
                url
                  ? "border-emerald-400/50 bg-emerald-400/5"
                  : "border-dashed border-zinc-300 hover:border-brand-500/60 hover:bg-brand-500/5 dark:border-white/15"
              )}
            >
              {url ? (
                <>
                  <img src={url} alt="" className="absolute inset-0 h-full w-full object-cover" />
                  <span className="absolute inset-0 flex items-center justify-center bg-black/40 text-[11px] font-medium text-white">
                    <CheckCircle2 className="mr-1 h-3.5 w-3.5" /> {SLOT_LABELS[slot]} · Дарж дахин авах
                  </span>
                </>
              ) : (
                <span className="flex flex-col items-center gap-1 text-[11px] font-medium text-zinc-400">
                  <Plus className="h-5 w-5" />
                  {SLOT_LABELS[slot]}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ParentGroup({
  label,
  value,
  onChange,
}: {
  label: string;
  value: ParentInfo;
  onChange: (v: ParentInfo) => void;
}) {
  return (
    <div className="space-y-3 rounded-lg border border-zinc-200 p-4 dark:border-white/10">
      <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">{label}</p>
      <Input label="Нэр" value={value.name} onChange={(e) => onChange({ ...value, name: e.target.value })} />
      <Input label="Утас" inputMode="numeric" value={value.phone} onChange={(e) => onChange({ ...value, phone: e.target.value })} />
      <Input label="Facebook холбоос" value={value.facebookLink} onChange={(e) => onChange({ ...value, facebookLink: e.target.value })} />
    </div>
  );
}

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

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-zinc-100 pb-3 last:border-0 dark:border-white/6">
      <span className="text-sm text-zinc-500 dark:text-zinc-400">{label}</span>
      <span className="max-w-[55%] text-right text-sm font-medium text-zinc-900 dark:text-white">{value}</span>
    </div>
  );
}

/* ---------- URL-аас lat/lng гаргах — Google Maps ?q=LAT,LNG format-аас ---------- */
function parseMapsLat(link: string): number {
  const m = link.match(/[?&]q=(-?[\d.]+),/);
  return m ? Number(m[1]) : 0;
}
function parseMapsLng(link: string): number {
  const m = link.match(/q=-?[\d.]+,(-?[\d.]+)/);
  return m ? Number(m[1]) : 0;
}
