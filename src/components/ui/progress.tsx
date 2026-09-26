import { cn } from "@/lib/utils";

export function Progress({ value, className, tone = "brand" }: { value: number; className?: string; tone?: "brand" | "gold" | "danger" }) {
  const clamped = Math.min(100, Math.max(0, value));
  return <div role="progressbar" aria-label="Ахиц" aria-valuenow={Math.round(clamped)} aria-valuemin={0} aria-valuemax={100} className={cn("h-1.5 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-white/15", className)}>
    <div className={cn("h-full rounded-full transition-all duration-500 ease-out", tone === "brand" && "bg-zinc-950 dark:bg-white", tone === "gold" && "bg-amber-500", tone === "danger" && "bg-rose-500")} style={{ width: `${clamped}%` }} />
  </div>;
}

export interface StepDef { key: string; label: string; }
export function Stepper({ steps, currentIndex, className, compact }: { steps: StepDef[]; currentIndex: number; className?: string; compact?: boolean; }) {
  const current = steps[currentIndex];
  const progress = steps.length > 1 ? (currentIndex / (steps.length - 1)) * 100 : 100;
  return <div className={cn("w-full", className)}>
    <div className="flex items-center justify-between gap-3 sm:hidden">
      <p className="min-w-0 truncate text-sm font-semibold text-zinc-950 dark:text-white">{current?.label}</p>
      <span className="shrink-0 text-xs font-medium tabular-nums text-zinc-500 dark:text-zinc-400">{currentIndex + 1} / {steps.length}</span>
    </div>
    <Progress value={progress} className="mt-2 sm:hidden" />
    <div className="hidden items-center sm:flex">
      {steps.map((step, i) => {
        const done = i < currentIndex; const active = i === currentIndex;
        return <div key={step.key} className={cn("flex items-center", i > 0 && "flex-1")}>
          {i > 0 ? <div className={cn("h-px flex-1", done ? "bg-zinc-950 dark:bg-white" : "bg-zinc-200 dark:bg-white/15")} /> : null}
          <div className={cn("flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold", done && "bg-zinc-950 text-white dark:bg-white dark:text-zinc-950", active && "bg-zinc-950 text-white ring-4 ring-zinc-950/10 dark:bg-white dark:text-zinc-950 dark:ring-white/10", !done && !active && "bg-zinc-200 text-zinc-500 dark:bg-white/10 dark:text-zinc-400")}>{done ? "✓" : String(i + 1)}</div>
        </div>;
      })}
    </div>
    {!compact ? <div className="mt-2 hidden sm:flex">{steps.map((step, i) => <div key={step.key} className={cn("flex-1 first:flex-none", i > 0 && "pl-2")}><span className={cn("block text-[11px] font-medium leading-tight", i === currentIndex ? "text-zinc-950 dark:text-white" : i < currentIndex ? "text-zinc-500 dark:text-zinc-400" : "text-zinc-400 dark:text-zinc-600")}>{step.label}</span></div>)}</div> : null}
  </div>;
}
