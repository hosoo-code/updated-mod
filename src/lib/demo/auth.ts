import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { demoGetSession, demoRemoveSession, demoSaveSession } from "./store";
import type { DemoSession } from "./store";

/**
 * Demo горимын session cookie (HMAC-тай, httpOnly).
 * Production-д ашиглагдахгүй — Supabase Auth session ажиллана.
 */

export const DEMO_SESSION_COOKIE = "arhat_demo_session";

const g = globalThis as unknown as { __arhatDemoSecret?: string };

function demoSecret(): string {
  if (!g.__arhatDemoSecret) {
    const fromEnv = process.env.DEMO_SIGN_SECRET;
    g.__arhatDemoSecret =
      fromEnv && fromEnv.length >= 16
        ? fromEnv
        : `demo-${Math.random().toString(36).slice(2)}-${Date.now().toString(36)}`;
  }
  return g.__arhatDemoSecret;
}

export async function demoCreateSession(session: DemoSession, res: NextResponse): Promise<void> {
  const token = crypto.randomUUID();
  demoSaveSession(session, token);
  res.cookies.set(DEMO_SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function demoClearSession(res: NextResponse): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(DEMO_SESSION_COOKIE)?.value;
  if (token) demoRemoveSession(token);
  res.cookies.set(DEMO_SESSION_COOKIE, "", { path: "/", maxAge: 0 });
}

export async function demoGetCurrentSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(DEMO_SESSION_COOKIE)?.value;
  if (!token) return null;
  return demoGetSession(token);
}
