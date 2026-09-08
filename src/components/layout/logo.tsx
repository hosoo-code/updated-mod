import { ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

/** ARHAT MODERATOR — лого */
export function Logo({ className, size = "md" }: { className?: string; size?: "sm" | "md" | "lg" }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <span
        className={cn(
          "relative flex items-center justify-center rounded-xl bg-gradient-to-br from-brand-400 via-brand-500 to-teal-600 shadow-glow",
          size === "sm" && "h-7 w-7",
          size === "md" && "h-8 w-8",
          size === "lg" && "h-10 w-10"
        )}
      >
        <ShieldCheck
          className={cn("text-white", size === "sm" && "h-4 w-4", size === "md" && "h-[18px] w-[18px]", size === "lg" && "h-6 w-6")}
        />
      </span>
      <span className="flex flex-col leading-none">
        <span
          className={cn(
            "font-bold tracking-tight text-zinc-900 dark:text-white",
            size === "sm" && "text-sm",
            size === "md" && "text-[15px]",
            size === "lg" && "text-lg"
          )}
        >
          ARHAT <span className="bg-gradient-to-r from-brand-400 to-teal-300 bg-clip-text text-transparent">MODERATOR</span>
        </span>
        <span className={cn("text-[9px] font-medium uppercase tracking-[0.22em] text-zinc-400 dark:text-zinc-500", size === "sm" && "hidden")}>
          Verified community
        </span>
      </span>
    </span>
  );
}
