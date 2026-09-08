"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Root error boundary — server-component render дээр тохиолдсон аливаа
 * uncaught throw энэхүү хуудас руу шилжинэ (blank/404-өөс сэргийнэ).
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[GlobalError]", error);
  }, [error]);

  return (
    <html lang="mn">
      <body className="flex min-h-screen items-center justify-center bg-[#f6f7f9] p-6 dark:bg-ink-950">
        <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-8 text-center shadow-sm dark:border-white/10 dark:bg-ink-900">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-amber-500/10 text-amber-500">
            <AlertTriangle className="h-7 w-7" />
          </div>
          <h1 className="text-xl font-bold text-zinc-900 dark:text-white">Ямар нэг алдаа гарлаа</h1>
          <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
            Системийн тохиргоог шалгана уу (Supabase/R2 environment хувьсагчууд). Дахин оролдоно уу.
          </p>
          {error?.digest ? (
            <p className="mt-2 break-all text-[11px] text-zinc-400">Digest: {error.digest}</p>
          ) : null}
          <div className="mt-6 flex justify-center gap-3">
            <Button onClick={reset}>Дахин оролдох</Button>
            <Button
              variant="secondary"
              onClick={() => {
                window.location.href = "/";
              }}
            >
              Нүүр рүү
            </Button>
          </div>
        </div>
      </body>
    </html>
  );
}
