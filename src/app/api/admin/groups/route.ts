import { withApi, readJson } from "@/lib/api-helpers";
import { requireAdmin } from "@/lib/auth";
import { err, ok } from "@/lib/security";
import { createGroup, listGroupsAdmin } from "@/lib/repo";
import { groupSchema } from "@/lib/validation";

export const GET = withApi(async () => {
  await requireAdmin();
  const groups = await listGroupsAdmin();
  return ok(groups);
});

export const POST = withApi(async (req) => {
  const admin = await requireAdmin();
  const body = await readJson<unknown>(req);
  const parsed = groupSchema.safeParse(body);
  if (!parsed.success) return err(parsed.error.issues[0]?.message ?? "Мэдээлэл буруу байна", 400);

  const d = parsed.data;
  await createGroup(
    {
      name: d.name,
      facebookUrl: d.facebookUrl || undefined,
      memberCount: d.memberCount,
      description: d.description || undefined,
      price: d.price,
      isActive: d.isActive,
    },
    admin.fullName ?? "admin"
  );
  return ok(null, { status: 201 });
});
