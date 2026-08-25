import { withApi } from "@/lib/api-helpers";
import { requireAdmin } from "@/lib/auth";
import { ok } from "@/lib/security";
import { getAdminStats } from "@/lib/repo";

export const GET = withApi(async () => {
  await requireAdmin();
  return ok(await getAdminStats());
});
