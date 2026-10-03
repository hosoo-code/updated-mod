import { NextRequest, NextResponse } from "next/server";

/**
 * Security helpers — rate limiting, origin check, IP extraction.
 * Бүх state-changing API route үүнийг ашиглана.
 */

export type ApiResult = NextResponse;

export function ok<T>(data: T, init?: ResponseInit): NextResponse {
  return NextResponse.json({ ok: true, data }, init);
}

export function err(message: string, status = 400, init?: ResponseInit): NextResponse {
  return NextResponse.json({ ok: false, error: message }, { status, ...init });
}

/**
 * Client IP — ЗӨВХӨН server-side metadata-аас авна.
 * Browser-оос IP унших оролдлого ХИЙХГҮЙ.
 */
export function extractClientIp(request: NextRequest): string {
  const fwd = request.headers.get("x-forwarded-for");
  if (fwd) {
    const first = fwd.split(",")[0]?.trim();
    if (first) return first;
  }
  const real = request.headers.get("x-real-ip");
  if (real) return real.trim();
  return "unknown";
}

/**
 * CSRF хамгаалалт: Browser Origin-той POST/PATCH/DELETE хүсэлтэд
 * Origin нь request Host-той таарах ёстой. (SameSite=Lax cookie + энэ шалгалт)
 */
export function checkSameOrigin(request: NextRequest): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true; // browser-гүй client (curl гэх мэт) — cookie байхгүй тул CSRF боломжгүй
  const host = request.headers.get("host");
  if (!host) return false;
  try {
    const originHost = new URL(origin).host;
    return originHost === host;
  } catch {
    return false;
  }
}

const buckets = new Map<string, { count: number; resetAt: number }>();

/**
 * Memory-based sliding-window rate limiter.
 * Production-д Redis/gateway level-ийн rate limit нэмэх нь зүйтэй.
 */
export function rateLimit(
  request: NextRequest,
  key: string,
  limit = 30,
  windowMs = 60_000
): { allowed: boolean; retryAfterSec: number } {
  const ip = extractClientIp(request);
  const bucketKey = `${key}:${ip}`;
  const now = Date.now();
  const current = buckets.get(bucketKey);

  if (!current || current.resetAt <= now) {
    buckets.set(bucketKey, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfterSec: 0 };
  }
  current.count += 1;
  if (current.count > limit) {
    return {
      allowed: false,
      retryAfterSec: Math.ceil((current.resetAt - now) / 1000),
    };
  }
  return { allowed: true, retryAfterSec: 0 };
}

export function withSecurity(
  request: NextRequest,
  key: string,
  limit = 30
): NextResponse | null {
  if (!checkSameOrigin(request)) {
    return err("Хүсэлтийн гарал үүсэл зөвшөөрөгдөөгүй", 403);
  }
  const rl = rateLimit(request, key, limit);
  if (!rl.allowed) {
    return err("Хэт олон хүсэлт илгээлээ. Түр хүлээгээд дахин оролдоно уу.", 429, {
      headers: { "Retry-After": String(rl.retryAfterSec) },
    });
  }
  return null;
}
