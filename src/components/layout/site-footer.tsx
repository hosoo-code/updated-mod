import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { Logo } from "./logo";

export function SiteFooter() {
  return (
    <footer className="border-t border-zinc-200/70 bg-white/60 dark:border-white/6 dark:bg-ink-950/60">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <div className="flex flex-col gap-8 sm:flex-row sm:items-start sm:justify-between">
          <div className="max-w-xs">
            <Logo />
            <p className="mt-3 text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
              Баталгаатай Moderator-ууд. Mobile Legends нийгэмлэгийн итгэлцлийн платформ.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
            <FooterCol
              title="Платформ"
              links={[
                { href: "/moderators", label: "Moderator-ууд" },
                { href: "/moderator/apply", label: "Moderator болох" },
                { href: "/login", label: "Нэвтрэх" },
              ]}
            />
            <FooterCol
              title="Баталгаажуулалт"
              links={[
                { href: "/verify", label: "Identity баталгаажуулалт" },
                { href: "/dashboard", label: "Миний status" },
              ]}
            />
            <FooterCol
              title="Хувийн нууцлал"
              links={[
                { href: "/verify", label: "Privacy notice" },
                { href: "/moderator/apply", label: "Өргөдөл" },
              ]}
            />
          </div>
        </div>
        <div className="mt-10 flex flex-col items-center justify-between gap-3 border-t border-zinc-200/70 pt-6 text-xs text-zinc-400 dark:border-white/6 dark:text-zinc-500 sm:flex-row">
          <p>© {new Date().getFullYear()} ARHAT MODERATOR. Бүх эрх хуулиар хамгаалагдсан.</p>
          <p className="flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5 text-brand-500" />
            Identity verification-ийг нууцлалтай хадгална
          </p>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, links }: { title: string; links: { href: string; label: string }[] }) {
  return (
    <div>
      <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">{title}</p>
      <ul className="space-y-2">
        {links.map((l) => (
          <li key={l.href + l.label}>
            <Link href={l.href} className="text-sm text-zinc-600 transition hover:text-brand-500 dark:text-zinc-400 dark:hover:text-brand-300">
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
