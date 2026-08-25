import type { Metadata } from "next";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { ApplyForm } from "./apply-form";

export const metadata: Metadata = { title: "Moderator болох" };

export default function ApplyPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-12 sm:px-6">
        <div className="mb-8 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-600 dark:text-brand-300">
            ARHAT MODERATOR
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-zinc-900 dark:text-white">
            Moderator болох өргөдөл
          </h1>
          <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
            Өргөдлийг admin баг хянаж, зөвшөөрсний дараа identity баталгаажуулалтаа хийх боломжтой болно.
          </p>
        </div>
        <ApplyForm />
      </main>
      <SiteFooter />
    </div>
  );
}
