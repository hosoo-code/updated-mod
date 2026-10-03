import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Logo } from "./logo";

export function SiteFooter() {
  return (
    <footer className="border-t border-zinc-200/80 bg-white dark:border-white/10 dark:bg-zinc-950">
      <div className="page-shell safe-pb py-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <Link href="/" className="group inline-flex items-center gap-3">
            <Logo />
            <span className="hidden h-5 w-px bg-zinc-200 dark:bg-white/10 sm:block" />
            <span className="hidden text-xs font-medium text-zinc-400 transition group-hover:text-zinc-700 dark:group-hover:text-zinc-200 sm:block">Trusted community</span>
          </Link>
          <nav className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-zinc-500 dark:text-zinc-400" aria-label="Footer navigation">
            <Link href="/moderators" className="transition hover:text-zinc-950 dark:hover:text-white">Moderator-ууд</Link>
            <Link href="/moderator/apply" className="transition hover:text-zinc-950 dark:hover:text-white">Moderator болох</Link>
            <Link href="/login" className="inline-flex items-center gap-1 font-semibold text-zinc-900 transition hover:text-brand-600 dark:text-white dark:hover:text-brand-300">Нэвтрэх <ArrowUpRight className="h-3.5 w-3.5" /></Link>
          </nav>
        </div>
        <div className="mt-5 flex flex-col gap-1 border-t border-zinc-200/80 pt-4 text-xs text-zinc-400 dark:border-white/10 dark:text-zinc-500 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} ARHAT MODERATOR</p>
          <p>Verified community for Mobile Legends</p>
        </div>
      </div>
    </footer>
  );
}
