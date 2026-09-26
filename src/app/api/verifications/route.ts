import { withApi, readJson } from "@/lib/api-helpers";
import { requireUser } from "@/lib/auth";
import { err, ok } from "@/lib/security";
import { createVerificationRequest, getModeratorForUser, getMyVerifications } from "@/lib/repo";
import { verificationCreateSchema } from "@/lib/validation";

export const GET = withApi(async () => {
  const user = await requireUser();
  const list = await getMyVerifications(user.id);
  return ok(list);
});

/**
 * POST /api/verifications — шинэ verification request үүсгэх.
 * Зөвшөөрөлгүйгээр (consentId) үүсгэх БОЛОМЖГҮЙ.
 */
export const POST = withApi(async (req) => {
  const user = await requireUser();
  const body = await readJson<unknown>(req);
  const parsed = verificationCreateSchema.safeParse(body);
  if (!parsed.success) return err(parsed.error.issues[0]?.message ?? "Мэдээлэл буруу байна", 400);

  const moderator = await getModeratorForUser(user.id);
  if (!moderator) {
    return err("Moderator профайл олдсонгүй. Эхлээд өргөдлөө баталгаажуулна уу.", 403);
  }

  const { id } = await createVerificationRequest(user.id, moderator, {
    documentType: parsed.data.documentType,
    consentId: parsed.data.consentId,
  });
  return ok({ id }, { status: 201 });
});
