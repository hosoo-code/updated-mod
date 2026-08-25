"use client";

import { useId, type ReactNode } from "react";

/** CSS-only tooltip — hover/focus дээр харагдана */
export function Tooltip({
  content,
  children,
  side = "top",
}: {
  content: ReactNode;
  children: ReactNode;
  side?: "top" | "bottom";
}) {
  const id = useId();
  return (
    <span className="group relative inline-flex" aria-describedby={id}>
      {children}
      <span
        id={id}
        role="tooltip"
        className={[
          "pointer-events-none absolute left-1/2 z-50 w-max max-w-[240px] -translate-x-1/2 rounded-lg border border-white/10 bg-ink-800 px-3 py-1.5 text-center text-xs font-medium text-white opacity-0 shadow-xl transition-all duration-200 group-hover:opacity-100 group-focus-visible:opacity-100 dark:bg-ink-700",
          side === "top" ? "bottom-full mb-2 translate-y-1 group-hover:translate-y-0" : "top-full mt-2 -translate-y-1 group-hover:translate-y-0",
        ].join(" ")}
      >
        {content}
      </span>
    </span>
  );
}
