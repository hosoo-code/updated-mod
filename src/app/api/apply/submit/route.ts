import { withApi, readJson } from "@/lib/api-helpers";
import { requireUser } from "@/lib/auth";
import { ok, err } from "@/lib/security";
import { submitModeratorApplication } from "@/lib/repo";
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
  if (!parsed.success) return err(parsed.error.issues[0]?.message ?? "Мэдээлэл буруу байна", 400);

  const d = parsed.data;
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
    idCardFrontUrls: d.idCardFrontUrls,
    idCardBackUrls: d.idCardBackUrls,
    selfieFaceUrl: d.selfieFaceUrl,
    selfieLeftUrl: d.selfieLeftUrl ?? null,
    selfieRightUrl: d.selfieRightUrl ?? null,
    birthCertificateUrl: d.birthCertificateUrl ?? null,
    parentIdUrl: d.parentIdUrl ?? null,
    parentIdOwner: d.parentIdOwner ?? null,
    father: d.father,
    mother: d.mother,
    bankAccounts: d.bankAccounts,
    mapsLink: d.address.mapsLink,
    vpnDetected: d.address.vpnCheck.detected,
    faceResult,
  });
  if (!app) return err("Анкет олдсонгүй эсвэл илгээх боломжгүй байна.", 400);

  return ok({ applicationId: app.id, status: app.status });
});
