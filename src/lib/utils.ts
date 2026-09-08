import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Төгрөгийн формат: 17,999₮ */
export function formatTugrik(value: number): string {
  return new Intl.NumberFormat("mn-MN", {
    maximumFractionDigits: 0,
  }).format(value) + "₮";
}

/** Member count: 511K */
export function formatMemberCount(value: number): string {
  if (value >= 1_000_000) {
    const m = value / 1_000_000;
    return `${m % 1 === 0 ? m : m.toFixed(1)}M`;
  }
  if (value >= 1_000) {
    const k = value / 1_000;
    return `${k % 1 === 0 ? k : k.toFixed(0)}K`;
  }
  return String(value);
}

// Огнооны форматлалт — Монгол хэлээр, НЭГДСЭН (deterministic).
// `toLocaleDateString("mn-MN")` нь ICU locale өгөгдлөөс хамаардаг тул
// сервер (Node ICU) ба браузер (бүрэн Mongolian ICU) өөр текст гаргадаг —
// hydration-ын алдаа (Hydration failed) үүсгэдэг байсан.
// Энд сар/өдрийг гараар, UTC талбараар форматлаж, сервер/client үргэлж
// ижил гаралт гаргана (timezone-ийн зөрүүгээс ч ангид).
function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

/** Прег msg: "2026 оны 9-р сарын 5" (детерминист, UTC) */
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return `${d.getUTCFullYear()} оны ${d.getUTCMonth() + 1}-р сарын ${d.getUTCDate()}`;
}

/** "2026 оны 9-р сарын 5, 09:00" (детерминист, UTC) */
export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return `${d.getUTCFullYear()} оны ${d.getUTCMonth() + 1}-р сарын ${d.getUTCDate()}, ${pad2(d.getUTCHours())}:${pad2(d.getUTCMinutes())}`;
}

/** "2026.09.05" (детерминист, UTC) */
export function formatShortDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return `${d.getUTCFullYear()}.${pad2(d.getUTCMonth() + 1)}.${pad2(d.getUTCDate())}`;
}

export function daysUntil(iso: string): number {
  const now = Date.now();
  const then = new Date(iso).getTime();
  return Math.max(0, Math.ceil((then - now) / 86_400_000));
}

export function addDaysISO(days: number, from?: Date): string {
  const d = from ? new Date(from) : new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

export function maskAccountNumber(account: string): string {
  if (account.length <= 4) return account;
  return "•".repeat(Math.max(4, account.length - 4)) + account.slice(-4);
}

export function initialsOf(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return (parts[0] ?? "").slice(0, 2).toUpperCase();
  const first = parts[0]?.[0] ?? "";
  const last = parts[parts.length - 1]?.[0] ?? "";
  return (first + last).toUpperCase();
}

/** Өнгөт gradient avatar-ын тогтмол өнгө сонгох */
const AVATAR_GRADIENTS = [
  "from-emerald-500 to-teal-600",
  "from-sky-500 to-indigo-600",
  "from-violet-500 to-purple-600",
  "from-amber-500 to-orange-600",
  "from-rose-500 to-pink-600",
  "from-cyan-500 to-blue-600",
];

export function avatarGradient(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return AVATAR_GRADIENTS[hash % AVATAR_GRADIENTS.length] ?? AVATAR_GRADIENTS[0]!;
}
