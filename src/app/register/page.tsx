import type { Metadata } from "next";
import { SiteFooter } from "@/components/layout/site-footer";
import { Logo } from "@/components/layout/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { RegisterForm } from "./register-form";

export const metadata: Metadata = { title: "Бүртгүүлэх" };

export default function RegisterPage() {
  return (
    <div className="flex min-h-screen flex-col bg-hero bg-hero-light dark:bg-hero">
      <header className="flex h-16 items-center justify-between px-4 sm:px-6">
        <Logo />
        <ThemeToggle />
      </header>
      <main className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-md animate-fade-up">
          <RegisterForm />
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
