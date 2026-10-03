import Link from "next/link";
import { Logo } from "./logo";
import { UserMenu } from "./user-menu";
import { ThemeToggle } from "../theme-toggle";
import { getSessionUser } from "@/lib/auth";

export async function SiteHeader() {
  const user = await getSessionUser();
  return <header className="sticky top-0 z-50 border-b border-zinc-200/80 bg-white/80 backdrop-blur-xl dark:border-white/10 dark:bg-zinc-950/80">
    <div className="page-shell flex h-14 items-center gap-1.5 sm:h-16 sm:gap-3">
      <Link href="/" aria-label="Нүүр хуудас" className="shrink-0"><Logo /></Link>
      <nav className="ml-auto flex min-w-0 items-center sm:ml-4" aria-label="Үндсэн цэс">
        <HeaderLink href="/moderators">Moderator-ууд</HeaderLink>
        <HeaderLink href="/moderator/apply" className="hidden sm:inline-flex">Moderator болох</HeaderLink>
      </nav>
      <div className="ml-1 flex shrink-0 items-center gap-1.5 sm:ml-auto"><ThemeToggle /><UserMenu user={user} /></div>
    </div>
  </header>;
}
function HeaderLink({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) { return <Link href={href} className={`rounded-lg px-2 py-2 text-xs font-medium text-zinc-600 transition hover:bg-zinc-100 hover:text-zinc-950 dark:text-zinc-400 dark:hover:bg-white/10 dark:hover:text-white sm:px-3 sm:text-sm ${className ?? ""}`}>{children}</Link>; }
