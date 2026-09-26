import { withApi, readJson } from "@/lib/api-helpers";
import { requireUser } from "@/lib/auth";
import { err, ok } from "@/lib/security";
import { getLatestActiveLocation, getModeratorForUser, shareLocation } from "@/lib/repo";
import { z } from "zod";

const shareSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  accuracy: z.number().min(0).max(100_000).nullable().optional(),
});

/**
 * POST /api/location/share — Хэрэглэгч browser GPS-ээс авсан байршлаа хадгална.
 * user_id нь ЗӨВХӨН сервер-талын session-ээс гарах бөгөөд client-аас авч БУ-у.
 * expires_at = shared_at + 7 хоног.
 */
export const POST = withApi(async (req) => {
  const user = await requireUser();
  const body = await readJson<unknown>(req);
  const parsed = shareSchema.safeParse(body);
  if (!parsed.success) return err("Байршлын мэдээлэл буруу байна.", 400);

  const moderator = await getModeratorForUser(user.id);
  const name = moderator?.nickname ?? user.fullName ?? "Хэрэглэгч";

  const record = await shareLocation(user.id, name, {
    latitude: parsed.data.latitude,
    longitude: parsed.data.longitude,
    accuracy: parsed.data.accuracy ?? null,
  });

  return ok(
    {
      id: record.id,
      coordinatedAt: record.createdAt,
      sharedAt: record.sharedAt ?? record.createdAt,
      expiresAt: record.expiresAt ?? record.createdAt,
      latitude: record.latitude,
      longitude: record.longitude,
    },
    { status: 201 }
  );
});

/**
 * GET /api/location/share — өөрийн идэвхтэй (7 хоногийн) location-ийг буцаана.
 * Expired бол null; Хэрэглэгч дахин хуваалцах шаардлагатай гэдгийг UI мэднэ.
 */
export const GET = withApi(async () => {
  const user = await requireUser();
  const active = await getLatestActiveLocation(user.id);
  if (!active) {
    return ok({ active: null });
  }
  return ok({
    active: {
      id: active.id,
      latitude: active.latitude,
      longitude: active.longitude,
      accuracy: active.accuracy,
      sharedAt: active.sharedAt ?? active.createdAt,
      expiresAt: active.expiresAt ?? active.createdAt,
    },
  });
});
