import { NextRequest } from "next/server";
import { withApi } from "@/lib/api-helpers";
import { err, ok } from "@/lib/security";
import { serverEnv } from "@/lib/env";
import { runRetention } from "@/lib/repo";

/**
 * POST /api/cron/retention — хугацаа хэтэрсэн document-уудыг устгах.
 * Зөвхөн CRON_SECRET header-тэй дуудлагад ажиллана (Cloudflare Workers cron
 * эсвэл Vercel Cron-оос дуудагдана).
 */
export const POST = withApi(async (req: NextRequest) => {
  const secret = req.headers.get("x-cron-secret") ?? "";
  const expected = serverEnv().cronSecret;
  if (!expected || secret !== expected) {
    return err("Зөвшөөрөлгүй хандалт.", 401);
  }
  const result = await runRetention();
  return ok(result);
});
