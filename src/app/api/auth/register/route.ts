import { NextResponse } from "next/server";
import { withApi, readJson } from "@/lib/api-helpers";
import { createSupabaseServer } from "@/lib/supabase/server";
import { isDemoMode } from "@/lib/demo-mode";
import { err, ok } from "@/lib/security";
import { z } from "zod";

const registerSchema = z.object({
  email: z.string().trim().email("И-мэйл буруу байна"),
  password: z.string().min(8, "Нууц үг 8-аас доошгүй тэмдэгт байх ёстой").max(72),
  fullName: z.string().trim().min(1, "Нэрээ оруулна уу").max(80),
});

export const POST = withApi(async (req) => {
  const body = await readJson<unknown>(req);
  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) return err(parsed.error.issues[0]?.message ?? "Мэдээлэл буруу байна", 400);

  if (isDemoMode()) {
    return err("Demo горимд бүртгэл нээх шаардлагагүй — demo хэрэглэгчээр нэвтэрнэ үү.", 400);
  }

  const sb = await createSupabaseServer();
  const { data, error } = await sb.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: { data: { full_name: parsed.data.fullName } },
  });
  if (error) {
    return err("Бүртгэл үүсгэхэд алдаа гарлаа: " + error.message, 400);
  }
  return ok({ needsEmailConfirm: !data.session });
});
