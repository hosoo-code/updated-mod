import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { serverEnv } from "../env";
import { isDemoMode } from "../demo-mode";

/**
 * Middleware — session refresh + secure headers.
 * Demo горимд Supabase оролцохгүй.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  // Secure headers
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set(
    "Permissions-Policy",
    "camera=(self), geolocation=(self), microphone=()"
  );

  if (isDemoMode()) return response;

  const env = serverEnv();
  if (!env.supabaseUrl) return response;

  try {
    const supabase = createServerClient(env.supabaseUrl, env.supabaseAnonKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    });

    await supabase.auth.getUser();
  } catch (e) {
    // Middleware дотор session refresh амжилтгүй болсон ч (сүлжээ, Supabase
    // сервис доголдол гэх мэт) БҮХ хүсэлтийг унагаж болохгүй — "Failed to
    // fetch" шиг network-level алдаа өгөхгүйгээр анхны response-оор үргэлжлүүлнэ.
    console.error("[middleware] Session refresh failed:", e);
  }

  return response;
}
