"use client";

import { forwardRef, useId, type InputHTMLAttributes, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

const baseField =
  "w-full rounded-xl border border-zinc-300 bg-white px-4 text-sm text-zinc-900 placeholder:text-zinc-400 transition-colors focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-400/30 dark:border-white/12 dark:bg-white/[0.05] dark:text-white dark:placeholder:text-zinc-500";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  error?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, hint, error, id, ...props }, ref) => {
    const autoId = useId();
    const inputId = id ?? autoId;
    return (
      <div className="flex flex-col gap-1.5">
        {label ? (
          <label htmlFor={inputId} className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            {label}
          </label>
        ) : null}
        <input id={inputId} ref={ref} className={cn(baseField, "h-11", error && "border-rose-500/60 focus:border-rose-500 focus:ring-rose-400/30", className)} {...props} />
        {hint && !error ? <p className="text-xs text-zinc-400 dark:text-zinc-500">{hint}</p> : null}
        {error ? <p className="text-xs font-medium text-rose-500">{error}</p> : null}
      </div>
    );
  }
);
Input.displayName = "Input";

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  hint?: string;
  error?: string;
}

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, hint, error, id, ...props }, ref) => {
    const autoId = useId();
    const inputId = id ?? autoId;
    return (
      <div className="flex flex-col gap-1.5">
        {label ? (
          <label htmlFor={inputId} className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            {label}
          </label>
        ) : null}
        <textarea
          id={inputId}
          ref={ref}
          className={cn(baseField, "min-h-[96px] py-3", error && "border-rose-500/60", className)}
          {...props}
        />
        {hint && !error ? <p className="text-xs text-zinc-400 dark:text-zinc-500">{hint}</p> : null}
        {error ? <p className="text-xs font-medium text-rose-500">{error}</p> : null}
      </div>
    );
  }
);
Textarea.displayName = "Textarea";

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { value: string; label: string }[];
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, error, id, options, ...props }, ref) => {
    const autoId = useId();
    const selectId = id ?? autoId;
    return (
      <div className="flex flex-col gap-1.5">
        {label ? (
          <label htmlFor={selectId} className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            {label}
          </label>
        ) : null}
        <select
          id={selectId}
          ref={ref}
          className={cn(baseField, "h-11 appearance-none bg-no-repeat pr-9", error && "border-rose-500/60", className)}
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%2371717a' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3e%3c/svg%3e\")",
            backgroundPosition: "right 0.75rem center",
            backgroundSize: "1.25em",
          }}
          {...props}
        >
          {options.map((o) => (
            <option key={o.value} value={o.value} className="bg-white text-zinc-900 dark:bg-ink-900 dark:text-white">
              {o.label}
            </option>
          ))}
        </select>
        {error ? <p className="text-xs font-medium text-rose-500">{error}</p> : null}
      </div>
    );
  }
);
Select.displayName = "Select";

export { Input, Textarea, Select };
