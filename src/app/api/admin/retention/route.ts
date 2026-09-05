import { withApi } from "@/lib/api-helpers";
import { requireAdmin } from "@/lib/auth";
import { ok } from "@/lib/security";
import { runRetention } from "@/lib/repo";

/** Admin гараар retention ажиллуулах */
export const POST = withApi(async () => {
  await requireAdmin();
  const result = await runRetention();
  return ok(result);
});
