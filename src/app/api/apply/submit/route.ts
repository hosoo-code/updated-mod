import { withApi, readJson } from "@/lib/api-helpers";
import { requireUser } from "@/lib/auth";
import { ok, err } from "@/lib/security";
import { getModeratorApplicationForUser, submitModeratorApplication } from "@/lib/repo";
import { buildApplicationObjectKey } from "@/lib/r2";
import { applyWizardSubmitSchema } from "@/lib/validation";
import type { FaceCheckResult } from "@/types";

/**
 * POST /api/apply/submit — Анкетыг бүрэн илгээнэ.
 * Бүх мэдээллийг server талд шалгаж (zod), зөвхөн өөрийн draft/editable анкет руу бичнэ.
 */
export const POST = withApi(async (req) => {
  const user = await requireUser();
  const body = await readJson<unknown>(req);
  const parsed = applyWizardSubmitSchema.safeParse(body);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const label = validationFieldLabel(issue?.path ?? []);
    console.warn("[apply/submit] validation failed", { path: issue?.path.join("."), code: issue?.code });
    return err(label ? `${label}: ${issue?.message ?? "мэдээлэл буруу байна"}` : issue?.message ?? "Мэдээлэл буруу байна", 400);
  }

  const d = parsed.data;
  const currentApp = await getModeratorApplicationForUser(user.id);
  if (!currentApp) return err("Анкет олдсонгүй эсвэл илгээх боломжгүй байна.", 400);

  const expected = (slot: string) => buildApplicationObjectKey(user.id, currentApp.id, slot);
  const validEvidence = new Set([
    expected("id-front-0"),
    expected("id-back-0"),
    expected("selfie"),
    expected("selfie-left"),
    expected("selfie-right"),
    expected("birth-certificate"),
    expected("parent-id"),
  ]);
  const evidence = [
    ...d.idCardFrontUrls,
    ...d.idCardBackUrls,
    d.selfieFaceUrl,
    d.selfieLeftUrl,
    d.selfieRightUrl,
    d.birthCertificateUrl,
    d.parentIdUrl,
  ].filter((value): value is string => Boolean(value));
  if (evidence.some((value) => !validEvidence.has(value))) {
    return err("Анкетын зурагны object key буруу байна.", 400);
  }

  // Хуучин client (poseCaptures/occluded-гүй) эсвэл задлан optional-оор normalize:
  // runtime дээр шинэ FaceCheckResult талбарууд 0/false-аар заавал байлгана.
  const faceResult: FaceCheckResult | null = d.faceResult
    ? {
        ...d.faceResult,
        checks: {
          ...d.faceResult.checks,
          poseCaptures: d.faceResult.checks.poseCaptures ?? 0,
          occluded: d.faceResult.checks.occluded ?? false,
        },
      }
    : null;
  const app = await submitModeratorApplication(user.id, {
    fullName: d.fullName,
    facebookLink: d.facebookLink,
    phoneNumbers: d.phoneNumbers,
    educationEmployment: d.educationEmployment,
    idCardFrontUrls: d.idCardFrontUrls,
    idCardBackUrls: d.idCardBackUrls,
    selfieFaceUrl: d.selfieFaceUrl,
    selfieLeftUrl: d.selfieLeftUrl ?? null,
    selfieRightUrl: d.selfieRightUrl ?? null,
    birthCertificateUrl: d.birthCertificateUrl ?? null,
    parentIdUrl: d.parentIdUrl ?? null,
    parentIdOwner: d.parentIdOwner ?? null,
    identityDocumentType: d.identityDocumentType ?? "id",
    father: d.father,
    mother: d.mother,
    bankAccounts: d.bankAccounts,
    mapsLink: d.address.mapsLink,
    faceResult,
  });
  if (!app) return err("Анкет олдсонгүй эсвэл илгээх боломжгүй байна.", 400);

  return ok({ applicationId: app.id, status: app.status });
});

function validationFieldLabel(path: PropertyKey[]): string | null {
  const key = path.map(String).join(".");
  const labels: Record<string, string> = {
    fullName: "Нэр",
    facebookLink: "Facebook холбоос",
    "phoneNumbers.0": "Үндсэн утасны дугаар",
    "phoneNumbers.1": "Нэмэлт утасны дугаар",
    "phoneNumbers.2": "Нэмэлт утасны дугаар",
    "educationEmployment.teacherPhone": "Багшийн утасны дугаар",
    "educationEmployment.directorPhone": "Захирал/менежерийн утасны дугаар",
    "father.phone": "Эцгийн утасны дугаар",
    "mother.phone": "Эхийн утасны дугаар",
  };
  return labels[key] ?? null;
}
