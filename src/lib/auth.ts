import { cookies } from "next/headers";
import { isDemoMode } from "./demo-mode";
import { demoGetSession, DEMO_ADMIN_USER_ID, DEMO_MODERATOR_USER_ID } from "./demo/store";
import { createSupabaseServer } from "./supabase/server";
import type { SessionUser } from "@/types";

export const DEMO_SESSION_COOKIE = "arhat_demo_session";

export class AuthError extends Error {
  status: number;
  constructor(message: string, status = 401) {
    super(message);
    this.status = status;
  }
}

async function readDemoSession(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(DEMO_SESSION_COOKIE)?.value;
  if (!token) return null;
  const session = demoGetSession(token);
  if (!session) return null;
  return {
    id: session.userId,
    email: session.email,
    role: session.role,
    fullName: session.fullName,
    moderatorId: session.moderatorId,
  };
}

async function readSupabaseSession(): Promise<SessionUser | null> {
  const sb = await createSupabaseServer();
  const { data } = await sb.auth.getUser();
  const user = data.user;
  if (!user) return null;
  const { data: profile } = await sb
    .from("profiles")
    .select("full_name, role, moderator_id")
    .eq("id", user.id)
    .maybeSingle();
  const role =
    profile?.role === "admin" || profile?.role === "super_admin" ? "admin" : "user";
  return {
    id: user.id,
    email: user.email ?? "",
    role,
    fullName: profile?.full_name ?? null,
    moderatorId: profile?.moderator_id ?? null,
  };
}

/** Одоогийн session-ийг унших (server-side). Client-ийн мэдээлэлд итгэхгүй. */
export async function getSessionUser(): Promise<SessionUser | null> {
  if (isDemoMode()) return readDemoSession();
  return readSupabaseSession();
}

/** Нэвтэрсэн байхыг шаардах (API route-уудад) */
export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) throw new AuthError("Нэвтрээгүй байна. Дахин нэвтэрнэ үү.", 401);
  return user;
}

/** Admin эрх шаардах — сервер талд ЗААВАЛ шалгана */
export async function requireAdmin(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) throw new AuthError("Нэвтрээгүй байна.", 401);
  if (user.role !== "admin") throw new AuthError("Энэ үйлдэлд эрх хүрэхгүй байна.", 403);
  return user;
}

export { DEMO_MODERATOR_USER_ID, DEMO_ADMIN_USER_ID };
