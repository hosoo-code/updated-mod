import "server-only";
import { cookies } from "next/headers";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { serverEnv } from "../env";

/**
 * Cookie-based SSR client — хэрэглэгчийн session-тай, RLS-д захирагддаг.
 */
export async function createSupabaseServer(): Promise<SupabaseClient> {
  const env = serverEnv();
  const cookieStore = await cookies();

  return createServerClient(env.supabaseUrl, env.supabaseAnonKey, {
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
  });
}

/** RLS-д захирагддаггүй, зөвхөн server дотор хэрэглэгддэг anon client */
export async function createAnonClient(): Promise<SupabaseClient> {
  const env = serverEnv();
  return createClient(env.supabaseUrl, env.supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
