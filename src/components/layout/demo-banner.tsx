import { FlaskConical } from "lucide-react";
import { isDemoMode } from "@/lib/demo-mode";

/**
 * Demo горимын мэдэгдэл — Supabase/R2 тохируулаагүй үед л харагдана.
 * Production (env тохируулсан) үед огт render хийгдэхгүй.
 */
export function DemoBanner() {
  if (!isDemoMode()) return null;
  return (
    <div className="flex items-center justify-center gap-2 border-b border-amber-500/20 bg-amber-500/10 px-4 py-1.5 text-center text-xs font-medium text-amber-700 dark:text-amber-300">
      <FlaskConical className="h-3.5 w-3.5 shrink-0" />
      <span>
        ДЕМО горим — Supabase/R2 тохируулаагүй тул өгөгдөл нь зохиомол бөгөөд сервер
        restart хийхэд шинэчлэгдэнэ. Бодит ажиллагаанд <code className="font-mono">.env.local</code> тохируулна.
      </span>
    </div>
  );
}
