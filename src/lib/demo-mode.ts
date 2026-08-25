import { serverEnv } from "./env";
import { isSupabaseConfigured } from "./env";

/**
 * DEMO MODE
 * ---------
 * Supabase/R2 тохируулаагүй орчинд (жишээ нь энэ preview) бүрэн UI/UX-ийг
 * үзүүлэхийн тулд in-memory өгөгдлийн сан ашиглана.
 *
 * Production-д: `DISABLE_DEMO_MODE=true` + Supabase env тохируулбал
 * бүх өгөгдөл Supabase/R2-оос уншигдана. Demo горимд бодит мэдээлэл
 * хадгалагдахгүй, сервер restart хийхэд demo өгөгдөл шинэчлэгдэнэ.
 */
export function isDemoMode(): boolean {
  if (serverEnv().supabaseUrl && process.env.DISABLE_DEMO_MODE !== "true") {
    return false;
  }
  if (!isSupabaseConfigured() && process.env.DISABLE_DEMO_MODE === "true") {
    return false;
  }
  return !isSupabaseConfigured();
}
