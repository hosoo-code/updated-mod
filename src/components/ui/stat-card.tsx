"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn, formatMemberCount, formatTugrik } from "@/lib/utils";

export type StatFormat = "number" | "members" | "tugrik";

/** Тоо тоолж өсдөг stat карт (smooth count-up) */
export function StatCard({
  label,
  value,
  format = "number",
  icon,
  tone = "brand",
  hint,
}: {
  label: string;
  value: number;
  format?: StatFormat;
  icon?: ReactNode;
  tone?: "brand" | "gold" | "danger" | "info" | "neutral";
  hint?: string;
}) {
  const [display, setDisplay] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const started = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !started.current) {
          started.current = true;
          const duration = 900;
          const start = performance.now();
          const tick = (now: number) => {
            const p = Math.min(1, (now - start) / duration);
            const eased = 1 - Math.pow(1 - p, 3);
            setDisplay(Math.round(value * eased));
            if (p < 1) requestAnimationFrame(tick);
          };
          requestAnimationFrame(tick);
        }
      },
      { threshold: 0.3 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [value]);

  const tones: Record<string, string> = {
    brand: "from-brand-500/15 to-teal-500/5 text-brand-600 dark:text-brand-300",
    gold: "from-gold-500/15 to-amber-500/5 text-gold-600 dark:text-gold-300",
    danger: "from-rose-500/15 to-rose-500/5 text-rose-600 dark:text-rose-300",
    info: "from-sky-500/15 to-sky-500/5 text-sky-600 dark:text-sky-300",
    neutral: "from-zinc-500/10 to-zinc-500/5 text-zinc-600 dark:text-zinc-300",
  };

  return (
    <div
      ref={ref}
      className="rounded-2xl border border-zinc-200/80 bg-white/90 p-5 shadow-card-light transition-transform duration-300 hover:-translate-y-0.5 dark:border-white/8 dark:bg-white/[0.04] dark:shadow-card"
    >
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">{label}</p>
        {icon ? (
          <span
            className={cn(
              "flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br",
              tones[tone]
            )}
          >
            {icon}
          </span>
        ) : null}
      </div>
      <p className="mt-2 text-3xl font-bold tracking-tight tabular-nums text-zinc-900 dark:text-white">
        {format === "members"
          ? formatMemberCount(display)
          : format === "tugrik"
            ? formatTugrik(display)
            : display.toLocaleString("mn-MN")}
      </p>
      {hint ? <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">{hint}</p> : null}
    </div>
  );
}
