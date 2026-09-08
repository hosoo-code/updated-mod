import { withApi, readJson } from "@/lib/api-helpers";
import { requireAdmin } from "@/lib/auth";
import { err, ok } from "@/lib/security";
import { getSettings, updateSettings } from "@/lib/repo";
import { settingsSchema } from "@/lib/validation";

export const GET = withApi(async () => {
  await requireAdmin();
  return ok(await getSettings());
});

export const PATCH = withApi(async (req) => {
  const admin = await requireAdmin();
  const body = await readJson<unknown>(req);
  const parsed = settingsSchema.safeParse(body);
  if (!parsed.success) return err(parsed.error.issues[0]?.message ?? "Мэдээлэл буруу байна", 400);

  await updateSettings(parsed.data, admin.fullName ?? "admin");
  return ok(null);
});
