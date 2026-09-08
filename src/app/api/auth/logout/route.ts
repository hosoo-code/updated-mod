import { NextResponse } from "next/server";
import { withApi } from "@/lib/api-helpers";
import { createSupabaseServer } from "@/lib/supabase/server";
import { isDemoMode } from "@/lib/demo-mode";
import { demoClearSession } from "@/lib/demo/auth";
import { ok } from "@/lib/security";

export const POST = withApi(async () => {
  if (isDemoMode()) {
    const res = NextResponse.json({ ok: true, data: null });
    await demoClearSession(res);
    return res;
  }
  const sb = await createSupabaseServer();
  await sb.auth.signOut();
  return ok(null);
});
