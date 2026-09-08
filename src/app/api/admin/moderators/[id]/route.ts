import { NextRequest } from "next/server";
import { withApi, readJson } from "@/lib/api-helpers";
import { requireAdmin } from "@/lib/auth";
import { err, ok } from "@/lib/security";
import { updateModeratorAdmin } from "@/lib/repo";
import { moderatorAdminSchema } from "@/lib/validation";

type Params = { params: Promise<{ id: string }> };

export const PATCH = withApi(async (req: NextRequest, { params }: Params) => {
  await requireAdmin();
  const { id } = await params;
  const body = await readJson<unknown>(req);
  const parsed = moderatorAdminSchema.safeParse(body);
  if (!parsed.success) return err(parsed.error.issues[0]?.message ?? "Мэдээлэл буруу байна", 400);

  await updateModeratorAdmin(id, parsed.data);
  return ok(null);
});
