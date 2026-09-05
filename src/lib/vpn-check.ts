import "server-only";
import { serverEnv } from "@/lib/env";

/**
 * VPN/Proxy илрүүлэлт — ЗӨВХӨН server талд ажиллана.
 *
 * Гуравдагч IP reputation API (жишээ: ipqualityscore.com) холбох боломжтой:
 *   .env.local-д: IP_REPUTATION_API_KEY=...
 *
 * API key тохируулаагүй бол `provider:"none"` → төлөвлөсөн buffer, VPN илрэхгүй
 * (dev/test-д урсгалыг саадгүй ажиллуулах). Бодит "VPN block + admin review"
 * шаардлагатай бол IP_REPUTATION_API_KEY-г оруулна — бүх хаяг хэлбэрийн алхам
 * энэ функциюг дууддаг тул нэг газарч холбогдоход хангалттай.
 *
 * VPN илэрвэл рутууд зохих Монгол алдаа буцаагаад, дахин оролдолт шаардана.
 */

export interface VpnCheckResult {
  detected: boolean;
  score: number; // 0-100, ≥ IPQUALITY_VPN_THRESHOLD бол block
  provider: "none" | "ipquality";
}

const VPN_THRESHOLD = 75; // vpn/proxy/tor score-ийн босго

/** IP qualityscore шиг format-тай серверийн privacy шалгалт */
async function checkIpQuality(ip: string, apiKey: string): Promise<VpnCheckResult> {
  try {
    const url = new URL(`https://ipqualityscore.com/api/json/ip/${apiKey}/${ip}`);
    url.searchParams.set("strictness", "0");
    // Хялбар болгох үүднээс server-client (undici) ашиглана
    const res = await fetch(url.toString(), { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return { detected: false, score: 0, provider: "ipquality" };
    const data = (await res.json()) as Record<string, unknown>;
    const vpn = Boolean(data.vpn);
    const proxy = Boolean(data.proxy);
    const tor = Boolean(data.tor);
    const fraudScore =
      typeof data.fraud_score === "number" ? data.fraud_score : 0;
    const detected = vpn || proxy || tor || fraudScore >= VPN_THRESHOLD;
    return { detected, score: Math.min(100, fraudScore), provider: "ipquality" };
  } catch {
    // API алдаа → fail-open (VPN гэж андуурч block хийхгүй), score 0
    return { detected: false, score: 0, provider: "ipquality" };
  }
}

/** Клиент IP-ийн VPN/Proxy статус шалгана */
export async function checkVpn(ip: string): Promise<VpnCheckResult> {
  const apiKey = process.env.IP_REPUTATION_API_KEY ?? "";
  if (apiKey) {
    return checkIpQuality(ip, apiKey);
  }
  // API key байхгүй → provider "none" — блоклохгүй
  return { detected: false, score: 0, provider: "none" };
}
