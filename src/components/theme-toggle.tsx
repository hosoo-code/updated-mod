"use client";
import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return <div className="h-11 w-11" aria-hidden />;
  return (
    <button
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      aria-label={theme === "dark" ? "Гэрэл горимд шилжих" : "Харанхуй горимд шилжих"}
      className="flex h-11 w-11 items-center justify-center rounded-xl text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950 focus-visible:ring-offset-2 dark:text-zinc-400 dark:hover:bg-white/10 dark:hover:text-white dark:focus-visible:ring-white dark:focus-visible:ring-offset-zinc-950"
    >
      {theme === "dark" ? <Sun className="h-[18px] w-[18px]" /> : <Moon className="h-[18px] w-[18px]" />}
    </button>
  );
}
