import { isSupabaseConfigured } from "./env";

/**
 * DEMO MODE
 * ---------
 * Supabase/R2 тохируулаагүй орчинд (жишээ нь dev/preview) бүрэн UI/UX-ийг
 * үзүүлэхийн тулд in-memory өгөгдлийн сан ашиглана.
 *
 * PRODUCTION-Д ДЕМО БҮРМӨСӨН УНТРААНА:
 *   Environment хувьсагчд `DISABLE_DEMO_MODE=true` тавь. Тэр үед
 *   Supabase env тохируулсан эсэхээс үл хамааран demo горим router-ээс
 *   хэзээ ч идэвхжихгүй — бүх өгөгдөл Supabase/R2-оос уншигдана.
 *
 * Анхаар: `DISABLE_DEMO_MODE=true` үед Supabase env тохируулаагүй бол
 * демо өгөгдөл алга, апп Supabase холбоогүй эвдрэх нь зөв — энэ нь
 * production-д Supabase заавал байх ёстой гэдгийг хангадаг.
 */
export function isDemoMode(): boolean {
  // DISABLE_DEMO_MODE=true → ямар ч нөхцөлд demo БИШ (production баталгаа)
  if (process.env.DISABLE_DEMO_MODE === "true") return false;
  // Supabase тохируулаагүй л бол demo (dev/test/preview)
  return !isSupabaseConfigured();
}
