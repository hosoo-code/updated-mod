import { withApi, readJson } from "@/lib/api-helpers";
import { requireUser } from "@/lib/auth";
import { err, ok } from "@/lib/security";
import { getModeratorForUser, updateMyProfile } from "@/lib/repo";
import { profileUpdateSchema } from "@/lib/validation";

export const GET = withApi(async () => {
  const user = await requireUser();
  const moderator = await getModeratorForUser(user.id);
  if (!moderator) return err("Moderator профайл олдсонгүй.", 404);
  return ok(moderator);
});

/** PATCH — өөрийн нийтийн мэдээллээ засах (nickname, facebook, phone) */
export const PATCH = withApi(async (req) => {
  const user = await requireUser();
  const body = await readJson<unknown>(req);
  const parsed = profileUpdateSchema.safeParse(body);
  if (!parsed.success) return err(parsed.error.issues[0]?.message ?? "Мэдээлэл буруу байна", 400);

  await updateMyProfile(user.id, {
    nickname: parsed.data.nickname,
    facebookUrl: parsed.data.facebookUrl === "" ? null : parsed.data.facebookUrl,
    phone: parsed.data.phone === "" ? null : parsed.data.phone,
  });
  return ok(null);
});
