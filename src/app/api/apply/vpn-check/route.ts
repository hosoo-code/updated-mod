import { NextRequest } from "next/server";
import { withApi } from "@/lib/api-helpers";
import { requireUser } from "@/lib/auth";
import { ok } from "@/lib/security";
import { extractClientIp } from "@/lib/security";
import { checkVpn } from "@/lib/vpn-check";

/**
 * POST /api/apply/vpn-check — Хаяг авах алхам бүрт ЗААВАЛ дуудагдана.
 * VPN/Proxy илэрвэл client хаяг авахыг блоклоод дахин оролдохыг хүснэ.
 * IP нь зөвхөн server-талын metadata-аас гарна (browser-аас биш).
 */
export const POST = withApi(async (req: NextRequest) => {
  await requireUser();
  const ip = extractClientIp(req);
  const result = await checkVpn(ip);
  return ok(result);
});
