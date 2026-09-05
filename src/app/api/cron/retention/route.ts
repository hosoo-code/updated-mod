import { NextRequest } from "next/server";
import { withApi } from "@/lib/api-helpers";
import { err, ok } from "@/lib/security";
import { serverEnv } from "@/lib/env";
import { runRetention } from "@/lib/repo";

/**
 * POST /api/cron/retention — хугацаа хэтэрсэн document-уудыг устгах.
 * Зөвхөн CRON_SECRET-тэй дуудлагад ажиллана.
 *
 * Давхар check — хоёрын аль нэг нь нийцэхэд хангалттай:
 *   1) `x-cron-secret: <CRON_SECRET>`   (гадаад HTTP fetch / pg_cron)
 *   2) `Authorization: Bearer <CRON_SECRET>`  (Vercel Cron / Workers cron)
 */
export const POST = withApi(async (req: NextRequest) => {
  const expected = serverEnv().cronSecret;
  const header1 = req.headers.get("x-cron-secret") ?? "";
  const auth = req.headers.get("authorization") ?? "";
  const header2 = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!expected || (header1 !== expected && header2 !== expected)) {
    return err("Зөвшөөрөлгүй хандалт.", 401);
  }
  const result = await runRetention();
  return ok(result);
});
