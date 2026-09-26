import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";
type Tone = "neutral" | "brand" | "gold" | "danger" | "warning" | "info" | "muted";
const tones: Record<Tone, string> = {
  neutral: "border-zinc-200 bg-zinc-100 text-zinc-700 dark:border-white/10 dark:bg-white/10 dark:text-zinc-200",
  brand: "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  gold: "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  danger: "border-rose-500/20 bg-rose-500/10 text-rose-700 dark:text-rose-300",
  warning: "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  info: "border-sky-500/20 bg-sky-500/10 text-sky-700 dark:text-sky-300",
  muted: "border-transparent bg-zinc-100 text-zinc-600 dark:bg-white/[0.07] dark:text-zinc-400",
};
export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> { tone?: Tone; dot?: boolean; icon?: ReactNode; }
export function Badge({ className, tone = "neutral", dot, icon, children, ...props }: BadgeProps) { return <span className={cn("inline-flex min-h-6 items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium leading-5", tones[tone], className)} {...props}>{icon}{dot ? <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden /> : null}{children}</span>; }
export function StatusBadge({ status }: { status: string }) { const map: Record<string, { label: string; tone: Tone }> = { unverified: { label: "Баталгаажаагүй", tone: "muted" }, pending: { label: "Хүлээгдэж буй", tone: "warning" }, approved: { label: "Баталгаажсан", tone: "brand" }, rejected: { label: "Татгалзсан", tone: "danger" }, expired: { label: "Хугацаа дууссан", tone: "muted" }, draft: { label: "Ноорог", tone: "muted" }, resubmit_requested: { label: "Дахин оруулах", tone: "info" }, submitted: { label: "Илгээгдсэн", tone: "info" }, editable: { label: "Засах хүсэлт", tone: "warning" }, verified: { label: "Баталгаажсан", tone: "brand" }, failed: { label: "Амжилтгүй", tone: "danger" }, logged: { label: "Бүртгэгдсэн", tone: "muted" }, active: { label: "Идэвхтэй", tone: "brand" }, inactive: { label: "Идэвхгүй", tone: "muted" }, denied: { label: "Татгалзсан", tone: "danger" }, unavailable: { label: "Боломжгүй", tone: "muted" }, none: { label: "Байхгүй", tone: "muted" } }; const conf = map[status] ?? { label: status, tone: "neutral" as Tone }; return <Badge tone={conf.tone} dot>{conf.label}</Badge>; }
