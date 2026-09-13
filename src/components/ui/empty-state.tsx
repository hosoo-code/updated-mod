import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-300/80 bg-white/60 px-6 py-14 text-center dark:border-white/10 dark:bg-white/[0.02]",
        className
      )}
    >
      {icon ? (
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-zinc-100 text-zinc-400 dark:bg-white/8 dark:text-zinc-500">
          {icon}
        </div>
      ) : null}
      <h3 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">{title}</h3>
      {description ? (
        <p className="mt-1.5 max-w-sm text-sm text-zinc-500 dark:text-zinc-400">{description}</p>
      ) : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}
