import { withApi, readJson } from "@/lib/api-helpers";
import { requireUser } from "@/lib/auth";
import { err, ok } from "@/lib/security";
import { addLocationRecord, getModeratorForUser } from "@/lib/repo";
import { coarsen } from "@/lib/geo";
import { z } from "zod";

const locationSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  accuracy: z.number().min(0).max(100_000).nullable().optional(),
  consentId: z.string().min(1).max(100).optional(),
  kind: z.enum(["identity", "weekly"]),
});

/**
 * POST /api/locations — user ЗӨВШӨӨРСӨН үед л дуудагдана.
 * Яг координат биш, ОЙРОЛЦОО (coarse) байршил хадгална.
 * Public API-д координат хэзээ ч илгээгдэхгүй.
 */
export const POST = withApi(async (req) => {
  const user = await requireUser();
  const body = await readJson<unknown>(req);
  const parsed = locationSchema.safeParse(body);
  if (!parsed.success) return err("Байршлын мэдээлэл буруу байна.", 400);

  const coarse = coarsen(parsed.data.latitude, parsed.data.longitude, parsed.data.accuracy ?? 0);
  const moderator = await getModeratorForUser(user.id);
  await addLocationRecord(
    user.id,
    moderator?.nickname ?? user.fullName ?? "Хэрэглэгч",
    { latitude: coarse.latitude!, longitude: coarse.longitude!, accuracy: coarse.accuracy },
    parsed.data.kind,
    parsed.data.consentId ?? null
  );
  return ok({ stored: coarse }, { status: 201 });
});
