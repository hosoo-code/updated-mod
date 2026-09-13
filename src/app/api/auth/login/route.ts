import { NextResponse } from "next/server";
import { withApi, readJson } from "@/lib/api-helpers";
import { createSupabaseServer } from "@/lib/supabase/server";
import { isDemoMode } from "@/lib/demo-mode";
import { DEMO_MODERATOR_USER_ID, DEMO_ADMIN_USER_ID } from "@/lib/demo/store";
import { demoCreateSession } from "@/lib/demo/auth";
import { err, ok } from "@/lib/security";

export const POST = withApi(async (req) => {
  const body = await readJson<{ email: string; password: string }>(req);
  const email = (body.email ?? "").trim().toLowerCase();
  const password = body.password ?? "";
  if (!email || !password) return err("И-мэйл, нууц үгээ оруулна уу.", 400);

  if (isDemoMode()) {
    // Demo горим: demo хэрэглэгчид (ямар ч нууц үгээр нэвтэрнэ)
    if (email === "mod@demo.mn") {
      const res = NextResponse.json({ ok: true, data: { role: "user" } });
      await demoCreateSession(
        {
          userId: DEMO_MODERATOR_USER_ID,
          email: "mod@demo.mn",
          role: "user",
          fullName: "Бат-Эрдэнэ Архат",
          moderatorId: "mod-1",
        },
        res
      );
      return res;
    }
    if (email === "admin@demo.mn") {
      const res = NextResponse.json({ ok: true, data: { role: "admin" } });
      await demoCreateSession(
        {
          userId: DEMO_ADMIN_USER_ID,
          email: "admin@demo.mn",
          role: "admin",
          fullName: "Архат Админ",
          moderatorId: null,
        },
        res
      );
      return res;
    }
    return err("Demo горимд mod@demo.mn эсвэл admin@demo.mn ашиглана уу.", 401);
  }

  const sb = await createSupabaseServer();
  const { data, error } = await sb.auth.signInWithPassword({ email, password });
  if (error || !data.user) {
    return err("И-мэйл эсвэл нууц үг буруу байна.", 401);
  }
  return ok({ role: "user" });
});
