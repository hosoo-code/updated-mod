import { withApi, readJson } from "@/lib/api-helpers";
import { requireUser } from "@/lib/auth";
import { err, ok } from "@/lib/security";
import { createConsent } from "@/lib/repo";
import { consentSchema } from "@/lib/validation";

/**
 * POST /api/consents — зөвшөөрлийг бүртгэх.
 * Consent version, purpose, timestamp, user_id хадгалагдана.
 */
export const POST = withApi(async (req) => {
  const user = await requireUser();
  const body = await readJson<unknown>(req);
  const parsed = consentSchema.safeParse(body);
  if (!parsed.success) return err(parsed.error.issues[0]?.message ?? "Мэдээлэл буруу байна", 400);

  const { id } = await createConsent(user.id, parsed.data.version, parsed.data.purpose);
  return ok({ consentId: id }, { status: 201 });
});
