import { NextRequest } from "next/server";
import { withApi, readJson } from "@/lib/api-helpers";
import { requireAdmin } from "@/lib/auth";
import { err, ok } from "@/lib/security";
import { decideApplication } from "@/lib/repo";
import { applicationDecisionSchema } from "@/lib/validation";

type Params = { params: Promise<{ id: string }> };

export const PATCH = withApi(async (req: NextRequest, { params }: Params) => {
  const admin = await requireAdmin();
  const { id } = await params;
  const body = await readJson<unknown>(req);
  const parsed = applicationDecisionSchema.safeParse(body);
  if (!parsed.success) return err("Мэдээлэл буруу байна.", 400);

  await decideApplication(id, parsed.data.decision, admin.fullName ?? "admin");
  return ok(null);
});
