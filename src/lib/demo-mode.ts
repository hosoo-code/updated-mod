import { isSupabaseConfigured } from "./env";

/**
 * Demo mode is enabled whenever Supabase is not fully configured.
 *
 * Vercel дээр Environment Variables-ийг хэсэгчлэн нэмсэн үед хуучин код real
 * mode руу орж, хоосон/буруу Supabase тохиргооноос болж page render унадаг
 * байсан. Бүх Supabase утга зөв болсон үед л production mode ажиллана.
 */
export function isDemoMode(): boolean {
  const supabaseConfigured = isSupabaseConfigured();

  // Supabase-ийн URL/key байхгүй эсвэл буруу байвал demo fallback ажиллана.
  // DISABLE_DEMO_MODE нь зөвхөн бүрэн тохирсон Supabase-тай үед demo-г унтраана.
  if (!supabaseConfigured) return true;
  return process.env.DISABLE_DEMO_MODE !== "true" && !supabaseConfigured;
}
