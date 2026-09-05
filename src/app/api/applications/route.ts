import { withApi, readJson } from "@/lib/api-helpers";
import { requireUser } from "@/lib/auth";
import { err, ok } from "@/lib/security";
import { createApplication, getMyApplications } from "@/lib/repo";
import { applicationSchema } from "@/lib/validation";

export const GET = withApi(async () => {
  const user = await requireUser();
  const apps = await getMyApplications(user.id);
  return ok(apps);
});

export const POST = withApi(async (req) => {
  const user = await requireUser();
  const body = await readJson<unknown>(req);
  const parsed = applicationSchema.safeParse(body);
  if (!parsed.success) return err(parsed.error.issues[0]?.message ?? "Мэдээлэл буруу байна", 400);

  const d = parsed.data;
  const { id } = await createApplication({
    userId: user.id,
    fullName: d.fullName,
    nickname: d.nickname,
    email: d.email,
    phone: d.phone || null,
    facebookUrl: d.facebookUrl || null,
    groupsText: d.groupsText || null,
    additionalInfo: d.additionalInfo || null,
  });
  return ok({ id }, { status: 201 });
});
