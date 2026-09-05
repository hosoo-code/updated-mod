import { cn } from "@/lib/utils";

export function Progress({
  value,
  className,
  tone = "brand",
}: {
  value: number;
  className?: string;
  tone?: "brand" | "gold" | "danger";
}) {
  const clamped = Math.min(100, Math.max(0, value));
  return (
    <div
      role="progressbar"
      aria-valuenow={Math.round(clamped)}
      aria-valuemin={0}
      aria-valuemax={100}
      className={cn("h-1.5 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-white/10", className)}
    >
      <div
        className={cn(
          "h-full rounded-full transition-all duration-500 ease-out",
          tone === "brand" && "bg-gradient-to-r from-brand-400 to-teal-400",
          tone === "gold" && "bg-gradient-to-r from-gold-400 to-amber-400",
          tone === "danger" && "bg-gradient-to-r from-rose-400 to-rose-500"
        )}
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}

export interface StepDef {
  key: string;
  label: string;
}

/** Алхамт wizard-ын дээд progress — 01 ━━━ 02 ━━━ 03 хэлбэртэй */
export function Stepper({
  steps,
  currentIndex,
  className,
  compact,
}: {
  steps: StepDef[];
  currentIndex: number;
  className?: string;
  compact?: boolean;
}) {
  return (
    <div className={cn("w-full", className)}>
      <div className="flex items-center">
        {steps.map((step, i) => {
          const done = i < currentIndex;
          const active = i === currentIndex;
          return (
            <div key={step.key} className={cn("flex items-center", i > 0 && "flex-1")}>
              {i > 0 ? (
                <div
                  className={cn(
                    "h-0.5 flex-1 rounded-full transition-colors duration-500",
                    done ? "bg-brand-500" : "bg-zinc-200 dark:bg-white/10"
                  )}
                />
              ) : null}
              <div
                className={cn(
                  "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold transition-all duration-300",
                  done && "bg-brand-500 text-white",
                  active && "bg-white text-ink-900 ring-2 ring-brand-500 dark:bg-brand-400 dark:text-ink-900 dark:ring-brand-400 shadow-glow",
                  !done && !active && "bg-zinc-200 text-zinc-500 dark:bg-white/8 dark:text-zinc-400"
                )}
              >
                {done ? "✓" : String(i + 1).padStart(2, "0")}
              </div>
            </div>
          );
        })}
      </div>
      {!compact ? (
        <div className="mt-2 flex">
          {steps.map((step, i) => (
            <div key={step.key} className={cn("flex-1 first:flex-none", i > 0 && "pl-2")}>
              <span
                className={cn(
                  "block text-[11px] font-medium leading-tight",
                  i === currentIndex
                    ? "text-brand-600 dark:text-brand-300"
                    : i < currentIndex
                      ? "text-zinc-500 dark:text-zinc-400"
                      : "text-zinc-400 dark:text-zinc-600"
                )}
              >
                {step.label}
              </span>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
