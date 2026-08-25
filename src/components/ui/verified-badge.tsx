import { BadgeCheck, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip } from "./tooltip";

/**
 * ✓ VERIFIED MODERATOR badge — premium, subtle animation, tooltip-тэй.
 * Public profile дээр sensitive мэдээлэл ХЭЗЭЭ Ч харагдахгүй.
 */
export function VerifiedBadge({
  size = "md",
  withText = true,
  className,
}: {
  size?: "sm" | "md" | "lg";
  withText?: boolean;
  className?: string;
}) {
  return (
    <Tooltip content="Identity verification completed" side="bottom">
      <span
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full border border-gold-500/30 bg-gradient-to-r from-gold-500/15 via-gold-400/20 to-gold-500/15 font-semibold text-gold-600 shadow-glow-gold dark:text-gold-300",
          size === "sm" && "px-2.5 py-0.5 text-[11px]",
          size === "md" && "px-3 py-1 text-xs",
          size === "lg" && "px-4 py-1.5 text-sm",
          "animate-shimmer bg-[length:200%_100%]",
          className
        )}
      >
        <ShieldCheck
          className={cn(
            "shrink-0",
            size === "sm" && "h-3.5 w-3.5",
            size === "md" && "h-4 w-4",
            size === "lg" && "h-5 w-5"
          )}
        />
        {withText ? "VERIFIED MODERATOR" : null}
      </span>
    </Tooltip>
  );
}

export function VerifiedIcon({ className }: { className?: string }) {
  return (
    <span className="relative inline-flex">
      <span className="absolute inset-0 rounded-full bg-gold-400/40 animate-pulse-ring" />
      <BadgeCheck className={cn("relative text-gold-500", className)} />
    </span>
  );
}
