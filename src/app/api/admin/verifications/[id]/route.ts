import { NextRequest } from "next/server";
import { withApi, readJson } from "@/lib/api-helpers";
import { requireAdmin } from "@/lib/auth";
import { err, ok } from "@/lib/security";
import { reviewVerification } from "@/lib/repo";
import { reviewDecisionSchema } from "@/lib/validation";

type Params = { params: Promise<{ id: string }> };

/**
 * PATCH /api/admin/verifications/[id]
 * Approve / Reject / Resubmit — үйлдэл бүр audit log-д бичигдэнэ.
 */
export const PATCH = withApi(async (req: NextRequest, { params }: Params) => {
  const admin = await requireAdmin();
  const { id } = await params;
  const body = await readJson<unknown>(req);
  const parsed = reviewDecisionSchema.safeParse(body);
  if (!parsed.success) return err(parsed.error.issues[0]?.message ?? "Мэдээлэл буруу байна", 400);

  const { decision, reason, note } = parsed.data;
  if ((decision === "reject" || decision === "resubmit") && !reason) {
    return err("Татгалзах шалтгаанаа сонгоно уу.", 400);
  }

  await reviewVerification(id, decision, reason ?? null, note ?? null, admin.fullName ?? "admin");
  return ok(null);
});
