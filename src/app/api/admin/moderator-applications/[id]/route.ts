import { NextRequest } from "next/server";
import { withApi, readJson } from "@/lib/api-helpers";
import { requireAdmin } from "@/lib/auth";
import { err, ok } from "@/lib/security";
import { setApplicationStatus } from "@/lib/repo";
import { setApplicationStatusSchema } from "@/lib/validation";

type Params = { params: Promise<{ id: string }> };

/**
 * PATCH /api/admin/moderator-applications/:id
 * Admin анкетын төлөвийг өөрчилнө: approve / reject / editable
 * Approved бол анкет түгжигдэнэ (цаашид өргөдөл гаргагч засах боломжгүй).
 */
export const PATCH = withApi(async (req: NextRequest, { params }: Params) => {
  const admin = await requireAdmin();
  const { id } = await params;
  const body = await readJson<unknown>(req);
  const parsed = setApplicationStatusSchema.safeParse(body);
  if (!parsed.success) return err(parsed.error.issues[0]?.message ?? "Мэдээлэл буруу байна.", 400);

  const app = await setApplicationStatus(admin.id, id, parsed.data.decision, parsed.data.notes || undefined);
  if (!app) return err("Анкет олдсонгүй.", 404);

  return ok(app);
});
