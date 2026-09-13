"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { Button } from "./button";

/** Дансны дугаар хуулах — хуулсны дараа "Хууллаа ✓" */
export function CopyButton({ value, label }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      // Clipboard API боломжгүй үед fallback
      const el = document.createElement("textarea");
      el.value = value;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Button
      type="button"
      size="sm"
      variant={copied ? "primary" : "outline"}
      onClick={copy}
      className={copied ? "bg-brand-500 text-white" : ""}
    >
      {copied ? (
        <>
          <Check className="h-3.5 w-3.5" /> Хууллаа
        </>
      ) : (
        <>
          <Copy className="h-3.5 w-3.5" /> {label ?? "Дансны дугаар хуулах"}
        </>
      )}
    </Button>
  );
}
