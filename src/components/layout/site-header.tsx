import Link from "next/link";
import { Logo } from "./logo";
import { UserMenu } from "./user-menu";
import { ThemeToggle } from "../theme-toggle";
import { getSessionUser } from "@/lib/auth";

export async function SiteHeader() {
  const user = await getSessionUser();
  return (
    <header className="sticky top-0 z-50 border-b border-zinc-200/70 bg-white/75 backdrop-blur-xl dark:border-white/6 dark:bg-ink-950/75">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4 sm:px-6">
        <Link href="/" aria-label="Нүүр хуудас" className="shrink-0">
          <Logo />
        </Link>
        <nav className="ml-2 hidden items-center gap-1 md:flex">
          <HeaderLink href="/moderators">Moderator-ууд</HeaderLink>
          <HeaderLink href="/moderator/apply">Moderator болох</HeaderLink>
        </nav>
        <div className="ml-auto flex items-center gap-2.5">
          <ThemeToggle />
          <UserMenu user={user} />
        </div>
      </div>
    </header>
  );
}

function HeaderLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="rounded-lg px-3 py-2 text-sm font-medium text-zinc-600 transition hover:bg-black/5 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-white/8 dark:hover:text-white"
    >
      {children}
    </Link>
  );
}
