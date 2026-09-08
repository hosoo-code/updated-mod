"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Root error boundary — page-ийн server/client render дээр гарсан uncaught
 * алдааг blank биш, найрсаг хуудас болгон харуулна (Deploy-ийн 404/blank-өөс
 * сэргийлэх хамгаалалтын давхарга).
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[Error boundary]", error);
  }, [error]);

  return (
    <div className="flex min-h-[70vh] items-center justify-center p-6">
      <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-8 text-center shadow-sm dark:border-white/10 dark:bg-ink-900">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-amber-500/10 text-amber-500">
          <AlertTriangle className="h-7 w-7" />
        </div>
        <h2 className="text-lg font-bold text-zinc-900 dark:text-white">Хуудас ачааллахад алдаа гарлаа</h2>
        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
          Хэсэг хугацааны дараа дахин оролдоно уу. Асуудал хэвээр байвал админтай холбогдоно уу.
        </p>
        {error?.digest ? (
          <p className="mt-2 break-all text-[11px] text-zinc-400">Digest: {error.digest}</p>
        ) : null}
        <div className="mt-6 flex justify-center">
          <Button onClick={reset}>
            <RefreshCw className="mr-1 h-4 w-4" /> Дахин оролдох
          </Button>
        </div>
      </div>
    </div>
  );
}
