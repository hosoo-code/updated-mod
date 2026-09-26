import { NextRequest } from "next/server";
import { withApi, readJson } from "@/lib/api-helpers";
import { requireUser } from "@/lib/auth";
import { err, ok, extractClientIp } from "@/lib/security";
import { getModeratorForUser, getWeeklyStatus, performWeekly } from "@/lib/repo";
import { weeklyLocationSchema } from "@/lib/validation";
import { coarsen } from "@/lib/geo";

/**
 * GET /api/weekly — 7 хоногийн баталгаажуулалтын төлөв.
 * POST /api/weekly — user ӨӨРӨӨ эхлүүлсэн үед л ажиллана.
 * IP-г зөвхөн SERVER-side metadata-аас авна (browser-оос БИШ).
 * Location зөвхөн user зөвшөөрсөн үед, ойролцоо хэлбэрээр.
 */
export const GET = withApi(async () => {
  const user = await requireUser();
  const status = await getWeeklyStatus(user.id);
  return ok(status);
});

export const POST = withApi(async (req: NextRequest) => {
  const user = await requireUser();
  const status = await getWeeklyStatus(user.id);
  if (!status.enabled) {
    return err("7 хоногийн баталгаажуулалт идэвхгүй байна.", 400);
  }

  const body = await readJson<unknown>(req);
  const parsed = weeklyLocationSchema.safeParse(body);
  if (!parsed.success) return err("Мэдээлэл буруу байна.", 400);

  const moderator = await getModeratorForUser(user.id);

  let location: { latitude: number | null; longitude: number | null; accuracy: number | null } | null = null;
  if (
    parsed.data.latitude !== undefined &&
    parsed.data.longitude !== undefined &&
    parsed.data.latitude !== null &&
    parsed.data.longitude !== null
  ) {
    const coarse = coarsen(parsed.data.latitude, parsed.data.longitude, parsed.data.accuracy ?? 0);
    location = { latitude: coarse.latitude, longitude: coarse.longitude, accuracy: coarse.accuracy };
  }

  const ip = extractClientIp(req);
  const result = await performWeekly(
    user.id,
    moderator?.nickname ?? user.fullName ?? "Хэрэглэгч",
    ip,
    location,
    parsed.data.consentId ?? null
  );

  return ok({ ...result, ipLogged: ip !== "unknown" });
});
