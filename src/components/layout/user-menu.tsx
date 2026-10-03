"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, LayoutDashboard, LogOut, ShieldCheck, LogIn } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import type { SessionUser } from "@/types";

export function UserMenu({ user }: { user: SessionUser | null }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  if (!user) {
    return (
      <Button size="sm" onClick={() => router.push("/login")}>
        <LogIn className="h-4 w-4" /> Нэвтрэх
      </Button>
    );
  }

  const logout = async () => {
    setBusy(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/");
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-xl border border-zinc-200/80 bg-white/70 py-1 pl-1 pr-2.5 transition hover:border-zinc-300 dark:border-white/10 dark:bg-white/5 dark:hover:border-white/20"
      >
        <Avatar name={user.fullName ?? user.email} size="sm" />
        <span className="hidden max-w-[120px] truncate text-sm font-medium text-zinc-800 dark:text-zinc-100 sm:block">
          {user.fullName ?? user.email}
        </span>
        <ChevronDown className="h-3.5 w-3.5 text-zinc-400" />
      </button>

      {open ? (
        <div className="absolute right-0 z-50 mt-2 w-56 overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-xl animate-fade-up dark:border-white/10 dark:bg-ink-800">
          <div className="border-b border-zinc-100 px-4 py-3 dark:border-white/8">
            <p className="truncate text-sm font-semibold text-zinc-900 dark:text-white">
              {user.fullName ?? "Хэрэглэгч"}
            </p>
            <p className="truncate text-xs text-zinc-400">{user.email}</p>
          </div>
          <nav className="p-1.5">
            <MenuItem icon={<LayoutDashboard className="h-4 w-4" />} label="Миний dashboard" onClick={() => { setOpen(false); router.push("/dashboard"); }} />
            {user.role === "admin" ? (
              <MenuItem icon={<ShieldCheck className="h-4 w-4" />} label="Admin panel" onClick={() => { setOpen(false); router.push("/admin"); }} />
            ) : null}
            <MenuItem
              icon={<LogOut className="h-4 w-4" />}
              label={busy ? "Гарч байна…" : "Гарах"}
              onClick={logout}
              danger
            />
          </nav>
        </div>
      ) : null}
    </div>
  );
}

function MenuItem({
  icon,
  label,
  onClick,
  danger,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={
        "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm font-medium transition " +
        (danger
          ? "text-rose-600 hover:bg-rose-500/10 dark:text-rose-400"
          : "text-zinc-700 hover:bg-black/5 dark:text-zinc-200 dark:hover:bg-white/8")
      }
    >
      {icon}
      {label}
    </button>
  );
}
