import {
  cloneElement,
  forwardRef,
  isValidElement,
  type ButtonHTMLAttributes,
  type ReactElement,
} from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex min-h-11 items-center justify-center gap-2 whitespace-nowrap rounded-xl px-5 text-sm font-semibold transition duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-45 active:scale-[0.98] select-none dark:focus-visible:ring-white dark:focus-visible:ring-offset-zinc-950",
  {
    variants: {
      variant: {
        primary: "bg-zinc-950 text-white shadow-sm hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200",
        secondary: "border border-zinc-200 bg-zinc-100 text-zinc-900 hover:bg-zinc-200 dark:border-white/10 dark:bg-white/10 dark:text-white dark:hover:bg-white/15",
        ghost: "text-zinc-700 hover:bg-zinc-100 hover:text-zinc-950 dark:text-zinc-300 dark:hover:bg-white/10 dark:hover:text-white",
        danger: "bg-rose-600 text-white shadow-sm hover:bg-rose-700 dark:bg-rose-500 dark:hover:bg-rose-600",
        gold: "bg-amber-400 text-zinc-950 shadow-sm hover:bg-amber-300",
        outline: "border border-zinc-300 bg-transparent text-zinc-800 hover:bg-zinc-100 dark:border-white/15 dark:text-zinc-200 dark:hover:bg-white/10",
      },
      size: {
        sm: "min-h-9 px-3.5 text-sm",
        md: "min-h-11 px-5 text-sm",
        lg: "min-h-12 px-6 text-base",
        xl: "min-h-14 px-8 text-base",
      },
      full: { true: "w-full" },
    },
    defaultVariants: { variant: "primary", size: "md" },
  }
);

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  loading?: boolean;
  asChild?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, full, loading, disabled, children, asChild, ...props }, ref) => {
    const classes = cn(buttonVariants({ variant, size, full }), className);
    if (asChild && isValidElement(children)) {
      const child = children as ReactElement<{ className?: string }>;
      return cloneElement(child, { className: cn(classes, child.props.className) });
    }
    return <button ref={ref} className={classes} disabled={disabled || loading} aria-busy={loading || undefined} {...props}>
      {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}{children}
    </button>;
  }
);
Button.displayName = "Button";
export { Button, buttonVariants };
