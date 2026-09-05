import "server-only";
import { cookies } from "next/headers";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { serverEnv } from "../env";

/**
 * Supabase проект unreachable/удаан үед бүх хуудсыг Vercel-ийн function
 * timeout (Hobby: 10s) хүртэл гацаахаас сэргийлнэ. Сүлжээний хүсэлт бүрийг
 * `timeoutMs`-ээр хязгаарлаж, хэтэрвэл AbortError шиднэ — үүнийг дуудагч тал
 * (auth.ts, repo.ts) аль хэдийн try/catch-аар барьдаг тул хуудас амьд үлдэнэ.
 */
function fetchWithTimeout(timeoutMs: number): typeof fetch {
  return (input: RequestInfo | URL, init?: RequestInit) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    return fetch(input, { ...init, signal: controller.signal }).finally(() =>
      clearTimeout(timer)
    );
  };
}

const AUTH_TIMEOUT_MS = 5000;
const QUERY_TIMEOUT_MS = 8000;

/**
 * Cookie-based SSR client — хэрэглэгчийн session-тай, RLS-д захирагддаг.
 */
export async function createSupabaseServer(): Promise<SupabaseClient> {
  const env = serverEnv();
  const cookieStore = await cookies();

  return createServerClient(env.supabaseUrl, env.supabaseAnonKey, {
    global: { fetch: fetchWithTimeout(AUTH_TIMEOUT_MS) },
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // Server Component дотор cookie set хийх боломжгүй — алгасах
        }
      },
    },
  });
}

/**
 * Service-role client — ЗӨВХӨН server-side, admin үйлдлүүдэд.
 * Client bundle-д хэзээ ч орох ёсгүй.
 */
export async function createServiceClient(): Promise<SupabaseClient> {
  const env = serverEnv();
  if (!env.supabaseServiceRoleKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY тохируулаагүй");
  }
  return createClient(env.supabaseUrl, env.supabaseServiceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: fetchWithTimeout(QUERY_TIMEOUT_MS) },
  });
}

/** RLS-д захирагддаггүй, зөвхөн server дотор хэрэглэгддэг anon client */
export async function createAnonClient(): Promise<SupabaseClient> {
  const env = serverEnv();
  return createClient(env.supabaseUrl, env.supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: fetchWithTimeout(QUERY_TIMEOUT_MS) },
  });
}
