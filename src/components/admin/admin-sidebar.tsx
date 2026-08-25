"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Banknote,
  FileText,
  FolderKanban,
  History,
  LayoutDashboard,
  ListChecks,
  MapPin,
  Menu,
  ShieldCheck,
  Settings,
  Tag,
  Users,
  Wifi,
  X,
  LogOut,
} from "lucide-react";
import { Logo } from "@/components/layout/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { Avatar } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/moderators", label: "Moderators", icon: Users },
  { href: "/admin/applications", label: "Өргөдлүүд", icon: FileText },
  { href: "/admin/verifications", label: "Verifications", icon: ListChecks },
  { href: "/admin/groups", label: "Groups", icon: FolderKanban },
  { href: "/admin/prices", label: "Үнэ", icon: Tag },
  { href: "/admin/accounts", label: "Payment Accounts", icon: Banknote },
  { href: "/admin/locations", label: "Locations", icon: MapPin },
  { href: "/admin/ips", label: "IP History", icon: Wifi },
  { href: "/admin/audit", label: "Audit Logs", icon: History },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];

export function AdminSidebar({ adminName }: { adminName: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  };

  const nav = (
    <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
      {NAV.map((item) => {
        const active = pathname === item.href || (item.href !== "/admin" && pathname.startsWith(item.href));
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all duration-200",
              active
                ? "bg-brand-500/12 text-brand-600 shadow-[inset_0_0_0_1px_rgba(16,185,129,0.25)] dark:bg-brand-500/15 dark:text-brand-300"
                : "text-zinc-500 hover:bg-black/5 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-white/6 dark:hover:text-white"
            )}
          >
            <Icon className="h-[18px] w-[18px] shrink-0" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );

  const bottom = (
    <div className="border-t border-zinc-200/80 p-3 dark:border-white/8">
      <div className="flex items-center gap-3 rounded-xl px-2 py-2">
        <Avatar name={adminName} size="sm" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-zinc-900 dark:text-white">{adminName}</p>
          <p className="flex items-center gap-1 text-[11px] text-brand-600 dark:text-brand-300">
            <ShieldCheck className="h-3 w-3" /> Super admin
          </p>
        </div>
        <button
          onClick={logout}
          aria-label="Гарах"
          className="rounded-lg p-2 text-zinc-400 transition hover:bg-rose-500/10 hover:text-rose-500"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile top bar */}
      <div className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-zinc-200/80 bg-white/80 px-4 backdrop-blur-xl dark:border-white/8 dark:bg-ink-950/80 lg:hidden">
        <Logo size="sm" />
        <div className="flex items-center gap-1.5">
          <ThemeToggle />
          <button
            onClick={() => setMobileOpen((v) => !v)}
            aria-label="Цэс нээх"
            className="rounded-xl p-2 text-zinc-500 hover:bg-black/5 dark:hover:bg-white/10"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      {mobileOpen ? (
        <div className="fixed inset-0 z-30 lg:hidden">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <div className="absolute inset-y-0 left-0 flex w-72 flex-col border-r border-zinc-200 bg-white animate-fade-in dark:border-white/8 dark:bg-ink-900">
            <div className="flex h-16 items-center px-4">
              <Logo />
            </div>
            {nav}
            {bottom}
          </div>
        </div>
      ) : null}

      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-zinc-200/80 bg-white/70 backdrop-blur-xl dark:border-white/6 dark:bg-ink-900/60 lg:flex">
        <div className="flex h-16 items-center justify-between px-5">
          <Link href="/admin">
            <Logo />
          </Link>
          <ThemeToggle />
        </div>
        {nav}
        {bottom}
      </aside>
    </>
  );
}
