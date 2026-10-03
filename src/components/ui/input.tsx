"use client";

import { forwardRef, useId, type InputHTMLAttributes, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

const baseField = "w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 text-sm text-zinc-950 placeholder:text-zinc-400 transition focus:border-zinc-950 focus:bg-white focus:outline-none focus:ring-2 focus:ring-zinc-950/10 disabled:cursor-not-allowed disabled:opacity-55 dark:border-white/10 dark:bg-white/[0.06] dark:text-white dark:placeholder:text-zinc-500 dark:focus:border-white dark:focus:bg-white/[0.09] dark:focus:ring-white/15";
export interface InputProps extends InputHTMLAttributes<HTMLInputElement> { label?: string; hint?: string; error?: string; }
const Input = forwardRef<HTMLInputElement, InputProps>(({ className, label, hint, error, id, ...props }, ref) => {
  const autoId = useId(); const inputId = id ?? autoId;
  return <div className="flex flex-col gap-1.5">
    {label ? <label htmlFor={inputId} className="text-sm font-medium text-zinc-800 dark:text-zinc-200">{label}</label> : null}
    <input id={inputId} ref={ref} aria-invalid={error ? true : undefined} aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined} className={cn(baseField, "h-11", error && "border-rose-500 bg-rose-50/50 focus:border-rose-600 focus:ring-rose-500/15 dark:bg-rose-500/5", className)} {...props} />
    {hint && !error ? <p id={`${inputId}-hint`} className="text-xs leading-5 text-zinc-500 dark:text-zinc-400">{hint}</p> : null}
    {error ? <p id={`${inputId}-error`} className="text-xs font-medium leading-5 text-rose-600 dark:text-rose-400">{error}</p> : null}
  </div>;
});
Input.displayName = "Input";
export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> { label?: string; hint?: string; error?: string; }
const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(({ className, label, hint, error, id, ...props }, ref) => {
  const autoId = useId(); const inputId = id ?? autoId;
  return <div className="flex flex-col gap-1.5">
    {label ? <label htmlFor={inputId} className="text-sm font-medium text-zinc-800 dark:text-zinc-200">{label}</label> : null}
    <textarea id={inputId} ref={ref} className={cn(baseField, "min-h-24 py-3", error && "border-rose-500 bg-rose-50/50 focus:border-rose-600 dark:bg-rose-500/5", className)} {...props} />
    {hint && !error ? <p id={`${inputId}-hint`} className="text-xs leading-5 text-zinc-500 dark:text-zinc-400">{hint}</p> : null}
    {error ? <p id={`${inputId}-error`} className="text-xs font-medium leading-5 text-rose-600 dark:text-rose-400">{error}</p> : null}
  </div>;
});
Textarea.displayName = "Textarea";
export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> { label?: string; error?: string; options: { value: string; label: string }[]; }
const Select = forwardRef<HTMLSelectElement, SelectProps>(({ className, label, error, id, options, ...props }, ref) => {
  const autoId = useId(); const selectId = id ?? autoId;
  return <div className="flex flex-col gap-1.5">
    {label ? <label htmlFor={selectId} className="text-sm font-medium text-zinc-800 dark:text-zinc-200">{label}</label> : null}
    <select id={selectId} ref={ref} className={cn(baseField, "h-11 appearance-none bg-no-repeat pr-9", error && "border-rose-500 bg-rose-50/50", className)} style={{ backgroundImage: "url(\"data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%2371717a' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3e%3c/svg%3e\")", backgroundPosition: "right 0.75rem center", backgroundSize: "1.25em" }} {...props}>
      {options.map((o) => <option key={o.value} value={o.value} className="bg-white text-zinc-900 dark:bg-zinc-900 dark:text-white">{o.label}</option>)}
    </select>
    {error ? <p id={`${selectId}-error`} className="text-xs font-medium leading-5 text-rose-600 dark:text-rose-400">{error}</p> : null}
  </div>;
});
Select.displayName = "Select";
export { Input, Textarea, Select };
