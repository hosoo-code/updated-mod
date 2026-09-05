import { AlertTriangle, RefreshCw, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "./button";

/** Алдааны дэлгэц — Монгол мессеж + retry товчтой */
export function ErrorState({
  title = "Алдаа гарлаа",
  description = "Түр хүлээгээд дахин оролдоно уу.",
  onRetry,
  className,
  icon: Icon = AlertTriangle,
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
  className?: string;
  icon?: LucideIcon;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-2xl border border-rose-500/20 bg-rose-500/[0.04] px-6 py-14 text-center",
        className
      )}
    >
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-500">
        <Icon className="h-7 w-7" />
      </div>
      <h3 className="text-base font-semibold text-zinc-900 dark:text-white">{title}</h3>
      <p className="mt-1.5 max-w-md text-sm text-zinc-500 dark:text-zinc-400">{description}</p>
      {onRetry ? (
        <Button variant="secondary" size="sm" className="mt-5" onClick={onRetry}>
          <RefreshCw className="h-4 w-4" /> Дахин оролдох
        </Button>
      ) : null}
    </div>
  );
}

export function PageLoader({ label = "Ачаалж байна…" }: { label?: string }) {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4">
      <div className="h-10 w-10 rounded-full border-2 border-brand-500/20 border-t-brand-500 animate-spin-slow" />
      <p className="text-sm text-zinc-500 dark:text-zinc-400">{label}</p>
    </div>
  );
}
