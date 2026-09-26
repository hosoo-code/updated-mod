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
import { DocumentCapture, ID_CARD_ASPECT_RATIO } from "@/components/camera/document-capture";
import { FaceCapture } from "@/components/camera/face-capture";
import { uploadApplicationImage } from "@/lib/client-upload";
import { cn } from "@/lib/utils";
import type {
  ApplyWizardData,
  FaceCheckResult,
  ParentInfo,
} from "@/types";

const SELFIE_SLOT = "selfie" as const;
const SELFIE_LEFT_SLOT = "selfie-left" as const;
const SELFIE_RIGHT_SLOT = "selfie-right" as const;
const BIRTH_CERT_SLOT = "birth-certificate" as const;
const PARENT_ID_SLOT = "parent-id" as const;
const FRONT_SLOTS = ["id-front-0"] as const;
const BACK_SLOTS = ["id-back-0"] as const;
type ImgSlot =
  | typeof FRONT_SLOTS[number]
  | typeof BACK_SLOTS[number]
  | typeof SELFIE_SLOT
  | typeof SELFIE_LEFT_SLOT
  | typeof SELFIE_RIGHT_SLOT
  | typeof BIRTH_CERT_SLOT
  | typeof PARENT_ID_SLOT;

const STEPS: StepDef[] = [
  { key: "info", label: "Хувийн мэдээлэл" },
  { key: "phone", label: "Утас" },
  { key: "education", label: "Сургууль, ажил" },
  { key: "idcard", label: "Иргэний үнэмлэх" },
  { key: "birthcert", label: "Төрсний гэрчилгээ" },
  { key: "parents", label: "Эцэг эх" },
  { key: "bank", label: "Банк" },
  { key: "address", label: "Хаяг" },
  { key: "selfie", label: "Селфи" },
  { key: "review", label: "Хяналт" },
  { key: "done", label: "Дууссан" },
];

const SLOT_LABELS: Record<ImgSlot, string> = {
  "id-front-0": "Иргэний үнэмлэх урд тал",
  "id-back-0": "Иргэний үнэмлэх ард тал",
  selfie: "Селфи (амьд нүүр)",
  "selfie-left": "Селфи зүүн",
  "selfie-right": "Селфи баруун",
  "birth-certificate": "Төрсний гэрчилгээ (бүтэн)",
  "parent-id": "Эцэг/эхийн үнэмлэх (урд)",
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
  const [educationEmployment, setEducationEmployment] = useState({
    ...initial.educationEmployment,
    teacherFacebookLink: initial.educationEmployment.teacherFacebookLink ?? "",
  });

  // Step 2/3 — ID зураг
  const [frontUrls, setFrontUrls] = useState<string[]>(initial.idCardFrontUrls);
  const [backUrls, setBackUrls] = useState<string[]>(initial.idCardBackUrls);
  const [selfieUrl, setSelfieUrl] = useState<string | null>(initial.selfieFaceUrl);
  const [selfieLeftUrl, setSelfieLeftUrl] = useState<string | null>(initial.selfieLeftUrl);
  const [selfieRightUrl, setSelfieRightUrl] = useState<string | null>(initial.selfieRightUrl);
  // Селфи liveness anti-spoof үр дүн — анкет илгээхэд server руу очно
  const [selfieResult, setSelfieResult] = useState<FaceCheckResult | null>(null);
  const [cameraOpen, setCameraOpen] = useState<{ kind: "document" | "selfie"; slot?: ImgSlot } | null>(null);
  const [uploading, setUploading] = useState(false);

  // Step 3 — төрсний гэрчилгээ (бүтэн)
  const [birthCertUrl, setBirthCertUrl] = useState<string | null>(initial.birthCertificateUrl);

  // Баримтын төрөл — 'id' (өөрийн үнэмлэх) эсвэл 'birth-cert' (төрсний гэрчилгээ + эцэг/эхийн үнэмлэх)
  const [identityType, setIdentityType] = useState<"id" | "birth-cert">(initial.identityDocumentType);

  // Step 4 — эцэг эх (мэдээлэл + сонгосон нэг эцэг/эхийн үнэмлэх)
  const [father, setFather] = useState<ParentInfo>(initial.father);
  const [mother, setMother] = useState<ParentInfo>(initial.mother);
  const [parentIdUrl, setParentIdUrl] = useState<string | null>(initial.parentIdUrl);
  const [parentIdOwner, setParentIdOwner] = useState<"father" | "mother" | null>(initial.parentIdOwner);

  // Step 5 — банк
  const [banks, setBanks] = useState(initial.bankAccounts);

  // Step 6 — хаяг
  const [mapsLink, setMapsLink] = useState<string | null>(initial.currentAddressMapsLink);
  const [locating, setLocating] = useState(false);

  // Step 7 — submit
  const [submitting, setSubmitting] = useState(false);
  const [finished, setFinished] = useState(false);

  /* ---------- Dynamic steps ----------
   * 'id' горимд төрсний гэрчилгээ + эцэг/эхийн үнэмлэх алхмууд шаардлагагүй тул
   * алгасаж, stepper-д ч харагдахгүй байна.
   */
  const activeStepKeys = useMemo(() => {
    const base = ["info", "phone", "education", "idcard", "bank", "address", "selfie", "review", "done"];
    if (identityType === "birth-cert") {
      return ["info", "phone", "education", "idcard", "birthcert", "parents", "bank", "address", "selfie", "review", "done"];
    }
    return base;
  }, [identityType]);
  const activeSteps = useMemo(
    () => activeStepKeys.map((k) => STEPS.find((s) => s.key === k)).filter((s): s is StepDef => !!s),
    [activeStepKeys]
  );
  const currentStepKey = activeStepKeys[step] ?? "done";

  /* ---------- Validation per step ---------- */
  const infoOk = fullName.trim().length > 0 && facebookLink.trim().length > 0;
  const phonesValid = useMemo(
    () => phones.every((p) => {
      const value = p.trim();
      return /^[+]?[-\d\s()]{6,24}$/.test(value) && (value.match(/\d/g) ?? []).length >= 8;
    }),
    [phones]
  );
  const phonesOk = phonesValid && phones.every((p) => p.trim().length > 0);
  const frontOk = useMemo(() => FRONT_SLOTS.every((_, i) => (frontUrls[i] ?? "").length > 0), [frontUrls]);
  const backOk = useMemo(() => BACK_SLOTS.every((_, i) => (backUrls[i] ?? "").length > 0), [backUrls]);
  // Баримтын төрлөөс хамаарах шаардлагууд:
  // 'id' горимд өөрийн үнэмлэх (урд+ард) заавал; төрсний гэрчилгээ/эцэг эхийн үнэмлэх шаардлагагүй.
  // 'birth-cert' горимд төрсний гэрчилгээ + эцэг/эхийн аль нэгний үнэмлэх заавал; өөрийн үнэмлэх шаардлагагүй.
  const isBirthCert = identityType === "birth-cert";
  const idOk = !isBirthCert && frontOk && backOk;
  const birthCertOk = isBirthCert ? !!birthCertUrl : true;
  const selfieOk = !!selfieUrl;
  // Эцэг/эхийн мэдээлэл заавал (төрсний гэрчилгээгээр баталгаажуулж байгаа үед л)
  const parentsOk =
    !isBirthCert ||
    (father.name.trim().length > 0 && father.phone.trim().length > 0 && father.facebookLink.trim().length > 0 &&
     mother.name.trim().length > 0 && mother.phone.trim().length > 0 && mother.facebookLink.trim().length > 0);
  // Сонгосон нэг эцэг/эхийн үнэмлэх + которынх нь гэдэг сонголт заавал (төрсний гэрчилгээний үед л)
  const parentIdOk = !isBirthCert || (!!parentIdUrl && !!parentIdOwner);
  const bankOk = banks.length > 0 && banks.every((b) => b.bankName.trim().length > 0 && /^[0-9]{6,20}$/.test(b.accountNumber.trim()));
  const addressOk = !!mapsLink;

  /* ---------- Image slots ---------- */
  const setSlot = (slot: ImgSlot, url: string) => {
    if (slot === SELFIE_SLOT) {
      setSelfieUrl(url);
      return;
    }
    if (slot === SELFIE_LEFT_SLOT) {
      setSelfieLeftUrl(url);
      return;
    }
    if (slot === SELFIE_RIGHT_SLOT) {
      setSelfieRightUrl(url);
      return;
    }
    if (slot === BIRTH_CERT_SLOT) {
      setBirthCertUrl(url);
      return;
    }
    if (slot === PARENT_ID_SLOT) {
      setParentIdUrl(url);
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
    if (slot === SELFIE_LEFT_SLOT) return selfieLeftUrl;
    if (slot === SELFIE_RIGHT_SLOT) return selfieRightUrl;
    if (slot === BIRTH_CERT_SLOT) return birthCertUrl;
    if (slot === PARENT_ID_SLOT) return parentIdUrl;
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

  const handleSelfieComplete = async (result: {
    blob: Blob;
    dataUrl: string;
    faceResult: FaceCheckResult;
    poses: { pose: "front" | "left" | "right"; blob: Blob; dataUrl: string }[];
  }) => {
    setCameraOpen(null);
    setUploading(true);
    try {
      // 3 байрлалт нүүр: pose бүрийг зөв slot-д R2-д upload хийнэ.
      // Урд (front) нь legacy "selfie" slot хэвээр — хуучин URL-ууд эвдрэхгүй.
      let anyUploaded = false;
      const poseSlots: Record<string, ImgSlot> = {
        front: SELFIE_SLOT,
        left: SELFIE_LEFT_SLOT,
        right: SELFIE_RIGHT_SLOT,
      };
      if (result?.poses && result.poses.length > 0) {
        const seen = new Set<string>();
        for (const p of result.poses) {
          if (seen.has(p.pose)) continue; // дэд урд/тал давхардахгүй
          seen.add(p.pose);
          const slot = poseSlots[p.pose];
          if (!slot) continue;
          try {
            const key = await uploadApplicationImage(p.blob, applicationId, slot);
            setSlot(slot, key);
            anyUploaded = true;
          } catch {
            // Тухайн pose-ийн upload алдаа гарвал бусад pose-г үргэлжлүүлнэ (fail-open)
          }
        }
      } else {
        // Legacy/fallback: зөвхөн урдыг upload хийнэ (blob backward-compat)
        const key = await uploadApplicationImage(result.blob, applicationId, SELFIE_SLOT);
        setSlot(SELFIE_SLOT, key);
        anyUploaded = true;
      }
      // Liveness үр дүнг хадгална — анкет илгээхэд admin хяналтад очно
      setSelfieResult(result.faceResult);
      if (!anyUploaded) {
        toast.error("Селфи хадгалахад алдаа гарлаа. Дахин оролдоно уу.");
        return;
      }
      toast.success("Нүүрний 3 байрлал амжилттай авагдлаа.");
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
      // Browser Geolocation
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
    if (!phonesOk) {
      toast.error("Утасны дугаар 8-аас доошгүй цифртэй, 24 тэмдэгтээс ихгүй байна.");
      setStep(activeStepKeys.indexOf("phone"));
      return;
    }
    if (!idOk || !selfieOk || !birthCertOk || !parentIdOk) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/apply/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: fullName.trim(),
          facebookLink: facebookLink.trim(),
          phoneNumbers: phones.map((p) => p.trim()).filter(Boolean),
          educationEmployment: {
            ...educationEmployment,
            schoolName: educationEmployment.schoolName.trim(),
            schoolGrade: educationEmployment.schoolGrade.trim(),
            teacherName: educationEmployment.teacherName.trim(),
            teacherPhone: educationEmployment.teacherPhone.trim(),
            teacherFacebookLink: educationEmployment.teacherFacebookLink.trim(),
            workplaceName: educationEmployment.workplaceName.trim(),
            workplaceLocation: educationEmployment.workplaceLocation.trim(),
            directorPhone: educationEmployment.directorPhone.trim(),
          },
          idCardFrontUrls: frontUrls.filter(Boolean),
          idCardBackUrls: backUrls.filter(Boolean),
          selfieFaceUrl: selfieUrl,
          selfieLeftUrl: selfieLeftUrl,
          selfieRightUrl: selfieRightUrl,
          birthCertificateUrl: birthCertUrl,
          parentIdUrl,
          parentIdOwner,
          identityDocumentType: identityType,
          faceResult: selfieResult,
          father,
          mother,
          bankAccounts: banks.map((b) => ({ bankName: b.bankName.trim(), accountNumber: b.accountNumber.trim() })),
          address: {
            mapsLink,
            latitude: mapsLink ? parseMapsLat(mapsLink) : 0,
            longitude: mapsLink ? parseMapsLng(mapsLink) : 0,
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
    if (currentStepKey === "info" && !infoOk) return toast.error("Нэр, Facebook линкээ оруулна уу.");
    if (currentStepKey === "phone" && !phonesOk) return toast.error("Утасны дугаар 8-аас доошгүй цифртэй, 24 тэмдэгтээс ихгүй байна.");
    if (currentStepKey === "idcard" && identityType === "id" && !idOk)
      return toast.error("Иргэний үнэмлэхийн урд, ард талын зургийг авах шаардлагатай.");
    if (currentStepKey === "birthcert" && !birthCertOk)
      return toast.error("Төрсний гэрчилгээг (бүтэн хуудсаар) авах шаардлагатай.");
    if (currentStepKey === "parents" && (!parentsOk || !parentIdOk))
      return toast.error("Эцэг, эхийн мэдээлэл болон нэг эцэг/эхийн үнэмлэхийг бөглөнө үү.");
    if (currentStepKey === "bank" && !bankOk) return toast.error("Хамгийн багадаа 1 данс зөв оруулна уу.");
    if (currentStepKey === "address" && !addressOk) return toast.error("Хаягаа (байршлаа) авах шаардлагатай.");
    if (currentStepKey === "selfie" && !selfieOk) return toast.error("Селфи (нүүр) авах шаардлагатай.");
    if (currentStepKey === "review") {
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
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="rounded-3xl border border-zinc-200 bg-zinc-950 px-6 py-7 text-white shadow-xl dark:border-white/10 dark:bg-white dark:text-zinc-950 sm:px-8">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-zinc-400 dark:text-zinc-500">ARHAT MODERATOR</p>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">Таны тухай мэдээлэл</h1>
        <p className="mt-2 max-w-xl text-sm leading-6 text-zinc-300 dark:text-zinc-600">Алхам бүрийг тайван бөглөж, үнэн зөв мэдээллээ оруулна уу.</p>
      </div>
      {editableMode ? (
        <p className="rounded-xl border border-amber-400/40 bg-amber-400/10 px-4 py-3 text-sm text-amber-700 dark:text-amber-300">
          ⌛ Admin таны анкетыг засах хүсэлтийг илгээсэн. Мэдээллээ засаад дахин илгээнэ үү.
        </p>
      ) : null}

      <Stepper steps={activeSteps} currentIndex={step} />

      {/* STEP 0 — Хувийн мэдээлэл */}
      {currentStepKey === "info" ? (
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
      {currentStepKey === "phone" ? (
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

      {/* STEP 2 — Баримтын төрөл + Иргэний үнэмлэх */}
      {currentStepKey === "education" ? (
        <Card>
          <CardContent className="space-y-4">
            <StepHeader icon={<Users className="h-5 w-5" />} title="Сургууль, ажил" subtitle="Сурдаг болон ажилладаг эсэхээ тэмдэглэнэ үү" />
            <SegmentedChoice
              label="Сурдаг эсэх"
              value={educationEmployment.isStudent}
              onChange={(value) => setEducationEmployment((v) => ({ ...v, isStudent: value }))}
              options={[{ value: true, label: "Тийм, сурдаг" }, { value: false, label: "Үгүй" }]}
            />
            {educationEmployment.isStudent ? <div className="space-y-4 rounded-2xl border border-zinc-200 bg-zinc-50/70 p-5 shadow-sm dark:border-white/10 dark:bg-white/[0.03]">
              <div>
                <p className="text-base font-semibold tracking-tight text-zinc-950 dark:text-white">Сургалтын мэдээлэл</p>
                <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">Багштай холбоо барих мэдээллээ бүрэн оруулна уу.</p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Input label="Сургуулийн нэр" value={educationEmployment.schoolName} onChange={(e) => setEducationEmployment((v) => ({ ...v, schoolName: e.target.value }))} />
                <Input label="Анги / курс" value={educationEmployment.schoolGrade} onChange={(e) => setEducationEmployment((v) => ({ ...v, schoolGrade: e.target.value }))} />
                <Input label="Багшийн нэр" value={educationEmployment.teacherName} onChange={(e) => setEducationEmployment((v) => ({ ...v, teacherName: e.target.value }))} />
                <Input label="Багшийн утас" inputMode="tel" value={educationEmployment.teacherPhone} onChange={(e) => setEducationEmployment((v) => ({ ...v, teacherPhone: e.target.value }))} />
              </div>
              <Input label="Багшийн Facebook холбоос" placeholder="https://facebook.com/teacher" value={educationEmployment.teacherFacebookLink} onChange={(e) => setEducationEmployment((v) => ({ ...v, teacherFacebookLink: e.target.value }))} />
            </div> : null}
            <SegmentedChoice
              label="Ажилладаг эсэх"
              value={educationEmployment.isEmployed}
              onChange={(value) => setEducationEmployment((v) => ({ ...v, isEmployed: value }))}
              options={[{ value: true, label: "Тийм, ажилладаг" }, { value: false, label: "Үгүй" }]}
            />
            {educationEmployment.isEmployed ? <div className="space-y-4 rounded-2xl border border-zinc-200 bg-zinc-50/70 p-5 shadow-sm dark:border-white/10 dark:bg-white/[0.03]">
              <Input label="Ажлын газрын нэр" value={educationEmployment.workplaceName} onChange={(e) => setEducationEmployment((v) => ({ ...v, workplaceName: e.target.value }))} />
              <Input label="Ажлын газрын байршил" value={educationEmployment.workplaceLocation} onChange={(e) => setEducationEmployment((v) => ({ ...v, workplaceLocation: e.target.value }))} />
              <Input label="Захирал / менежерийн утас" inputMode="tel" value={educationEmployment.directorPhone} onChange={(e) => setEducationEmployment((v) => ({ ...v, directorPhone: e.target.value }))} />
            </div> : null}
            <WizardNav onBack={() => setStep(Math.max(0, step - 1))} onNext={next} nextLabel="Үргэлжлүүлэх" />
          </CardContent>
        </Card>
      ) : null}

      {currentStepKey === "idcard" ? (
        <Card>
          <CardContent className="space-y-4">
            <StepHeader icon={<Fingerprint className="h-5 w-5" />} title="Баримтын төрөл" subtitle="Аль баримтаар баталгаажуулах вэ?" />

            {/* Баримтын төрөл сонгох */}
            <div className="grid gap-2">
              {([
                { value: "id", title: "Өөрийн иргэний үнэмлэх", desc: "Өөрийн үнэмлэхний урд + ард талын зургийг авах" },
                { value: "birth-cert", title: "Төрсний гэрчилгээ", desc: "Төрсний гэрчилгээ + эцэг/эхийн аль нэгний үнэмлэх авах" },
              ] as const).map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    setIdentityType(opt.value);
                    // Горим солиход одоогийн алхамд үлдэнэ
                  }}
                  className={
                    "rounded-xl border px-4 py-3 text-left transition-all " +
                    (identityType === opt.value
                      ? "border-brand-500/60 bg-brand-500/10 text-brand-700 dark:text-brand-300"
                      : "border-zinc-200 hover:border-zinc-300 dark:border-white/10")
                  }
                >
                  <p className="text-sm font-semibold">{opt.title}</p>
                  <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">{opt.desc}</p>
                </button>
              ))}
            </div>

            {/* 'id' горимд — өөрийн иргэний үнэмлэх (урд + ард) */}
            {identityType === "id" ? (
              <>
                <SlotGrid title="Урд тал" slots={FRONT_SLOTS} urls={frontUrls} onTake={(slot) => setCameraOpen({ kind: "document", slot })} onRetake={(slot) => setCameraOpen({ kind: "document", slot })} />
                <SlotGrid title="Ар тал" slots={BACK_SLOTS} urls={backUrls} onTake={(slot) => setCameraOpen({ kind: "document", slot })} onRetake={(slot) => setCameraOpen({ kind: "document", slot })} />
                <WizardNav onBack={() => setStep(1)} onNext={next} nextLabel="Үргэлжлүүлэх" nextDisabled={!idOk} hint={idOk ? "Урд + ард авсан ✓" : "Урд, ард талын зургийг хоёуланг нь авах шаардлагатай"} />
              </>
            ) : (
              <>
                <div className="rounded-lg border border-brand-500/30 bg-brand-500/5 p-4 text-sm text-zinc-700 dark:text-zinc-300">
                  Төрсний гэрчилгээний горим сонгогдлоо. Дараагийн алхмаар төрсний гэрчилгээгээ
                  (бүтэн хуудсаар) авна. Өөрийн иргэний үнэмлэх шаардлагагүй.
                </div>
                <WizardNav onBack={() => setStep(1)} onNext={next} nextLabel="Төрсний гэрчилгээ рүү" nextDisabled={false} />
              </>
            )}
          </CardContent>
        </Card>
      ) : null}

      {/* STEP 3 — Төрсний гэрчилгээ (зөвхөн 'birth-cert' горимд харагдана) */}
      {currentStepKey === "birthcert" ? (
        <Card>
          <CardContent className="space-y-4">
            <StepHeader icon={<Fingerprint className="h-5 w-5" />} title="Төрсний гэрчилгээ" subtitle="Бүтэн хуудсаар нь авах — зөвхөн 1 зураг" />
            <div className="rounded-lg border border-brand-500/30 bg-brand-500/5 p-3 text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">
              Төрсний гэрчилгээний эзэн нь <span className="font-semibold">өргөдөл гаргагч та</span> байх ёстой.
              Төрсний гэрчилгээгээр баталгаажуулж байгаа тул дараагийн алхмаар эцэг/эхийн аль нэгний
              үнэмлэхийг авах шаардлагатай.
            </div>
            <SlotGrid title="Төрсний гэрчилгээ (бүтэн хуудас)" slots={[BIRTH_CERT_SLOT]} urls={birthCertUrl ? [birthCertUrl] : []} onTake={(slot) => setCameraOpen({ kind: "document", slot })} onRetake={(slot) => setCameraOpen({ kind: "document", slot })} />
            <WizardNav onBack={() => setStep(2)} onNext={next} nextLabel="Үргэлжлүүлэх" nextDisabled={!birthCertOk} hint={birthCertOk ? "Төрсний гэрчилгээ авсан ✓" : "Төрсний гэрчилгээг авах шаардлагатай"} />
          </CardContent>
        </Card>
      ) : null}

      {/* STEP 4 — Эцэг эх (зөвхөн 'birth-cert' горимд харагдана) */}
      {currentStepKey === "parents" ? (
        <Card>
          <CardContent className="space-y-5">
            <StepHeader icon={<Users className="h-5 w-5" />} title="Эцэг эхийн мэдээлэл" subtitle="Бүх талбар заавал + нэг эцэг/эхийн үнэмлэх" />

            {/* Ялгаварласан тайлбар — төрсний гэрчилгээ эзэмшигч ↔ эцэг/эхийн үнэмлэх */}
            <div className="space-y-1.5 rounded-lg border border-brand-500/30 bg-brand-500/5 p-4">
              <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                Хэн хэний үнэмлэх вэ?
              </p>
              <p className="text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">
                Төрсний гэрчилгээний эзэн нь <span className="font-semibold">өргөдөл гаргагч та</span> байх
                ёстой. Доор бөглөсөн эцэг/эх таны төрсний гэрчилгээнд бичигдсэн эцэг эсвэл эх байх шаардлагатай.
                Сонгосон эцэг/эхийнхээ үнэмлэхийг авна — тухайн хүн таны эцэг эсвэл эх байгааг admin шалгана.
              </p>
            </div>
            <ParentGroup label="Эцэг" value={father} onChange={setFather} />
            <ParentGroup label="Эх" value={mother} onChange={setMother} />

            {/* Аль эцэг/эхийн үнэмлэхийг авах вэ — ээж эсвэл аав */}
            <div className="space-y-3 rounded-lg border border-zinc-200 p-4 dark:border-white/10">
              <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                Аль эцэг/эхийн үнэмлэхийг авах вэ?
              </p>
              <div className="flex gap-2">
                {(["father", "mother"] as const).map((owner) => (
                  <button
                    key={owner}
                    type="button"
                    onClick={() => setParentIdOwner(owner)}
                    className={
                      "flex-1 rounded-xl border px-4 py-3 text-sm font-medium transition-all " +
                      (parentIdOwner === owner
                        ? "border-brand-500/60 bg-brand-500/10 text-brand-700 dark:text-brand-300"
                        : "border-zinc-200 text-zinc-500 hover:border-zinc-300 dark:border-white/10 dark:text-zinc-400")
                    }
                  >
                    {owner === "father" ? "Аав" : "Ээж"}
                  </button>
                ))}
              </div>
              <p className="text-xs text-zinc-400">
                Төрсний гэрчилгээний эзэн (та)-ийн эцэг эсвэл эхийн үнэмлэхний урд талыг аваарай.
                Сонгосон хүн төрсний гэрчилгээнд бичигдсэн эцэг/эх байх ёстой.
              </p>
              <SlotGrid title={`${parentIdOwner === "mother" ? "Ээж" : "Аав"}гийн үнэмлэх (урд)`} slots={[PARENT_ID_SLOT]} urls={parentIdUrl ? [parentIdUrl] : []} onTake={(slot) => setCameraOpen({ kind: "document", slot })} onRetake={(slot) => setCameraOpen({ kind: "document", slot })} />
            </div>

            <WizardNav onBack={() => setStep(3)} onNext={next} nextLabel="Үргэлжлүүлэх" nextDisabled={!(parentsOk && parentIdOk)} />
          </CardContent>
        </Card>
      ) : null}

      {/* STEP 5 — Банк */}
      {currentStepKey === "bank" ? (
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
            <WizardNav onBack={() => setStep(Math.max(0, step - 1))} onNext={next} nextLabel="Үргэлжлүүлэх" nextDisabled={!bankOk} />
          </CardContent>
        </Card>
      ) : null}

      {/* STEP 6 — Хаяг */}
      {currentStepKey === "address" ? (
        <Card>
          <CardContent className="space-y-4">
            <StepHeader icon={<MapPin className="h-5 w-5" />} title="Гэрийн хаяг / Байршил" subtitle="GPS-ээр одоогийн байршлаа тэмдэглэнэ" />
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
            <WizardNav onBack={() => setStep(Math.max(0, step - 1))} onNext={next} nextLabel="Селфи рүү" nextDisabled={!addressOk} />
          </CardContent>
        </Card>
      ) : null}

      {/* STEP 7 — Селфи (бүртгүүлэхээс өмнө, нүүр царай уншуулах) */}
      {currentStepKey === "selfie" ? (
        <Card>
          <CardContent className="space-y-4">
            <StepHeader icon={<ScanFace className="h-5 w-5" />} title="Селфи (нүүр царай)" subtitle="Анкет илгээхээс өмнө нүүр царайгаа уншуулна — Liveness шалгалтыг давах шаардлагатай" />
            {selfieUrl ? (
              <div className="flex flex-col items-center gap-4 py-4 text-center">
                {/* 3 байрлалт нүүр: урд том, зүүн/баруун тал жижиг */}
                <div className="flex items-end justify-center gap-3">
                  <img src={selfieLeftUrl ?? ""} alt="Селфи зүүн" className={`h-20 w-20 rounded-xl border border-zinc-200 object-cover dark:border-white/10 ${selfieLeftUrl ? "" : "opacity-30"}`} />
                  <img src={selfieUrl} alt="Селфи урд" className="h-32 w-32 rounded-2xl border-2 border-emerald-400 object-cover dark:border-emerald-500" />
                  <img src={selfieRightUrl ?? ""} alt="Селфи баруун" className={`h-20 w-20 rounded-xl border border-zinc-200 object-cover dark:border-white/10 ${selfieRightUrl ? "" : "opacity-30"}`} />
                </div>
                <p className="text-xs text-zinc-400">
                  Урд ✓ {selfieLeftUrl ? "· Зүүн ✓" : "· Зүүн —"} {selfieRightUrl ? "· Баруун ✓" : "· Баруун —"}
                </p>
                <Button full onClick={() => setCameraOpen({ kind: "selfie" })}>Дахин авах</Button>
              </div>
            ) : (
              <Button full onClick={() => setCameraOpen({ kind: "selfie" })}>
                <ScanFace className="h-4 w-4" /> Селфи авах
              </Button>
            )}
            <WizardNav onBack={() => setStep(Math.max(0, step - 1))} onNext={next} nextLabel="Үргэлжлүүлэх" nextDisabled={!selfieOk} />
          </CardContent>
        </Card>
      ) : null}

      {/* STEP 8 — Хяналт */}
      {currentStepKey === "review" ? (
        <Card>
          <CardContent className="space-y-4">
            <StepHeader icon={<CheckCircle2 className="h-5 w-5" />} title="Хяналт" subtitle="Илгээхээс өмнө бүх мэдээллээ шалгана уу" />
            <div className="space-y-1 rounded-xl border border-zinc-200 p-4 dark:border-white/10">
              <ReviewRow label="Нэр" value={fullName} />
              <ReviewRow label="Facebook" value={facebookLink} />
              <ReviewRow label="Утас" value={phones.filter(Boolean).join(", ")} />
              <ReviewRow label="Сурдаг эсэх" value={educationEmployment.isStudent ? "Тийм" : "Үгүй"} />
              {educationEmployment.isStudent ? <>
                <ReviewRow label="Сургууль" value={educationEmployment.schoolName} />
                <ReviewRow label="Анги / курс" value={educationEmployment.schoolGrade} />
                <ReviewRow label="Багш" value={`${educationEmployment.teacherName} · ${educationEmployment.teacherPhone}`} />
                <ReviewRow label="Багшийн Facebook" value={educationEmployment.teacherFacebookLink} />
              </> : null}
              <ReviewRow label="Ажилладаг эсэх" value={educationEmployment.isEmployed ? "Тийм" : "Үгүй"} />
              {educationEmployment.isEmployed ? <>
                <ReviewRow label="Ажлын газар" value={educationEmployment.workplaceName} />
                <ReviewRow label="Ажлын байршил" value={educationEmployment.workplaceLocation} />
                <ReviewRow label="Захирал / менежер" value={educationEmployment.directorPhone} />
              </> : null}
              <ReviewRow label="Баримт" value={identityType === "birth-cert" ? "Төрсний гэрчилгээ + эцэг/эхийн үнэмлэх" : "Өөрийн иргэний үнэмлэх"} />
              {identityType === "id" ? (
                <ReviewRow label="Иргэний үнэмлэх зураг" value={idOk ? "Урд + ард ✓" : "Бүрэн биш"} />
              ) : (
                <>
                  <ReviewRow label="Төрсний гэрчилгээ" value={birthCertOk ? "✓" : "—"} />
                  <ReviewRow label="Эцэг/эх үнэмлэх" value={parentIdOk ? `${parentIdOwner === "mother" ? "Ээж" : "Аав"} · ✓` : "—"} />
                </>
              )}
              <ReviewRow label="Селфи" value={selfieOk ? `Урд ✓${selfieLeftUrl ? " · Зүүн ✓" : " · Зүүн —"}${selfieRightUrl ? " · Баруун ✓" : " · Баруун —"}` : "—"} />
              {identityType === "birth-cert" ? (
                <>
                  <ReviewRow label="Эцэг" value={`${father.name} · ${father.phone} · ${father.facebookLink}`} />
                  <ReviewRow label="Эх" value={`${mother.name} · ${mother.phone} · ${mother.facebookLink}`} />
                </>
              ) : null}
              <ReviewRow label="Банк" value={banks.map((b) => `${b.bankName}: ${b.accountNumber}`).join(", ")} />
              <ReviewRow label="Хаяг" value={mapsLink ?? "—"} />
            </div>
            <WizardNav onBack={() => setStep(Math.max(0, step - 1))} onNext={next} nextLabel={submitting ? "Илгээж байна…" : editableMode ? "Дахин илгээх" : "Анкетыг илгээх"} nextDisabled={submitting} />
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
          // Иргэний үнэмлэх (ID-1: 85.6×54мм) — зургийг яг үнэмлэхийн хэмжээний тэгш өнцөгтөд тааруулж авна
          aspectRatio={
            cameraOpen.slot.startsWith("id-") || cameraOpen.slot === "parent-id"
              ? ID_CARD_ASPECT_RATIO
              : undefined
          }
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
                  {/* object-contain — баримт бүрэн хэмжээгээр, тайралтгүй харагдана */}
                  <img src={url} alt="" className="absolute inset-0 h-full w-full object-contain" />
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

function SegmentedChoice({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
  options: { value: boolean; label: string }[];
}) {
  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{label}</legend>
      <div className="grid grid-cols-2 gap-2 rounded-2xl bg-zinc-100 p-1 dark:bg-white/[0.06]">
        {options.map((option) => (
          <button
            key={option.label}
            type="button"
            aria-pressed={value === option.value}
            onClick={() => onChange(option.value)}
            className={cn(
              "rounded-xl px-4 py-3 text-sm font-medium transition-all",
              value === option.value
                ? "bg-white text-zinc-950 shadow-sm dark:bg-zinc-900 dark:text-white"
                : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
            )}
          >
            {option.label}
          </button>
        ))}
      </div>
    </fieldset>
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
    <div className="space-y-4 rounded-2xl border border-zinc-200 bg-zinc-50/70 p-5 shadow-sm dark:border-white/10 dark:bg-white/[0.03]">
      <div>
        <p className="text-base font-semibold tracking-tight text-zinc-950 dark:text-white">{label}</p>
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">Нэр, утас болон Facebook холбоосыг бүрэн оруулна уу.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="Нэр" placeholder={`${label}ийн бүтэн нэр`} value={value.name} onChange={(e) => onChange({ ...value, name: e.target.value })} />
        <Input label="Утасны дугаар" inputMode="tel" placeholder="99112233" value={value.phone} onChange={(e) => onChange({ ...value, phone: e.target.value })} />
      </div>
      <Input label="Facebook холбоос" placeholder="https://facebook.com/yourname" value={value.facebookLink} onChange={(e) => onChange({ ...value, facebookLink: e.target.value })} />
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
      <span className="max-w-[62%] break-words text-right text-sm font-medium text-zinc-900 dark:text-white">{value}</span>
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
