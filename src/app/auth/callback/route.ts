import { NextResponse } from "next/server";
import { createServiceClient, createSupabaseServer } from "@/lib/supabase/server";
import { isDemoMode } from "@/lib/demo-mode";

function safeNext(value: string | null): string {
  return value && value.startsWith("/") && !value.startsWith("//") ? value : "/dashboard";
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = safeNext(url.searchParams.get("next"));

  if (isDemoMode() || !code) {
    return NextResponse.redirect(new URL(`/login?error=oauth_callback&next=${encodeURIComponent(next)}`, url.origin));
  }

  const sb = await createSupabaseServer();
  const { error } = await sb.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(new URL(`/login?error=oauth_callback&next=${encodeURIComponent(next)}`, url.origin));
  }

  const { data: authData } = await sb.auth.getUser();
  const user = authData.user;
  if (user) {
    try {
      const service = await createServiceClient();
      await service.from("profiles").upsert(
        {
          id: user.id,
          full_name: user.user_metadata?.full_name ?? user.user_metadata?.name ?? user.email?.split("@")[0] ?? "Хэрэглэгч",
          role: "user",
        },
        { onConflict: "id", ignoreDuplicates: true }
      );
    } catch (profileError) {
      console.error("[oauth] Profile sync failed:", profileError);
    }
  }

  return NextResponse.redirect(new URL(next, url.origin));
}
