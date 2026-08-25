import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

type Tone = "neutral" | "brand" | "gold" | "danger" | "warning" | "info" | "muted";

const tones: Record<Tone, string> = {
  neutral: "bg-zinc-500/10 text-zinc-700 dark:bg-white/8 dark:text-zinc-200 border-zinc-500/20 dark:border-white/10",
  brand: "bg-brand-500/10 text-brand-700 dark:text-brand-300 border-brand-500/25",
  gold: "bg-gold-500/10 text-gold-600 dark:text-gold-300 border-gold-500/25",
  danger: "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/25",
  warning: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/25",
  info: "bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/25",
  muted: "bg-black/5 text-zinc-500 dark:bg-white/5 dark:text-zinc-400 border-transparent",
};

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: Tone;
  dot?: boolean;
  icon?: ReactNode;
}

export function Badge({ className, tone = "neutral", dot, icon, children, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium leading-5",
        tones[tone],
        className
      )}
      {...props}
    >
      {icon}
      {dot ? <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden /> : null}
      {children}
    </span>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; tone: Tone }> = {
    unverified: { label: "Баталгаажаагүй", tone: "muted" },
    pending: { label: "Хүлээгдэж буй", tone: "warning" },
    approved: { label: "Баталгаажсан", tone: "brand" },
    rejected: { label: "Татгалзсан", tone: "danger" },
    expired: { label: "Хугацаа дууссан", tone: "muted" },
    draft: { label: "Ноорог", tone: "muted" },
    resubmit_requested: { label: "Дахин оруулах", tone: "info" },
    verified: { label: "Баталгаажсан", tone: "brand" },
    failed: { label: "Амжилтгүй", tone: "danger" },
    logged: { label: "Бүртгэгдсэн", tone: "muted" },
    active: { label: "Идэвхтэй", tone: "brand" },
    inactive: { label: "Идэвхгүй", tone: "muted" },
    denied: { label: "Татгалзсан", tone: "danger" },
    unavailable: { label: "Боломжгүй", tone: "muted" },
    none: { label: "Байхгүй", tone: "muted" },
  };
  const conf = map[status] ?? { label: status, tone: "neutral" as Tone };
  return (
    <Badge tone={conf.tone} dot>
      {conf.label}
    </Badge>
  );
}
