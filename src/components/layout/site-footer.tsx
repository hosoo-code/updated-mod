import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { Logo } from "./logo";

export function SiteFooter() {
  return <footer className="border-t border-zinc-200 bg-white/70 dark:border-white/10 dark:bg-zinc-950/70">
    <div className="page-shell safe-pb py-8 sm:py-10">
      <div className="flex flex-col gap-8 sm:flex-row sm:items-start sm:justify-between">
        <div className="max-w-xs"><Logo /><p className="mt-3 text-sm leading-6 text-zinc-500 dark:text-zinc-400">Баталгаатай Moderator-ууд. Mobile Legends нийгэмлэгийн итгэлцлийн платформ.</p></div>
        <div className="grid grid-cols-2 gap-x-8 gap-y-7 sm:grid-cols-3"><FooterCol title="Платформ" links={[{ href: "/moderators", label: "Moderator-ууд" }, { href: "/moderator/apply", label: "Moderator болох" }, { href: "/login", label: "Нэвтрэх" }]} /><FooterCol title="Баталгаажуулалт" links={[{ href: "/verify", label: "Identity баталгаажуулалт" }, { href: "/dashboard", label: "Миний status" }]} /><FooterCol title="Хувийн нууцлал" links={[{ href: "/verify", label: "Privacy notice" }, { href: "/moderator/apply", label: "Өргөдөл" }]} /></div>
      </div>
      <div className="mt-8 flex flex-col gap-3 border-t border-zinc-200 pt-5 text-xs leading-5 text-zinc-500 dark:border-white/10 dark:text-zinc-400 sm:mt-10 sm:flex-row sm:items-center sm:justify-between"><p>© {new Date().getFullYear()} ARHAT MODERATOR. Бүх эрх хуулиар хамгаалагдсан.</p><p className="flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5" />Identity verification-ийг нууцлалтай хадгална</p></div>
    </div>
  </footer>;
}
function FooterCol({ title, links }: { title: string; links: { href: string; label: string }[] }) { return <div><p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">{title}</p><ul className="space-y-2.5">{links.map((l) => <li key={l.href + l.label}><Link href={l.href} className="text-sm text-zinc-600 transition hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-white">{l.label}</Link></li>)}</ul></div>; }
