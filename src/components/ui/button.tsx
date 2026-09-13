import {
  Children,
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
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400/60 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98] select-none",
  {
    variants: {
      variant: {
        primary:
          "bg-gradient-to-b from-brand-400 to-brand-600 text-white shadow-[0_4px_20px_-4px_rgba(16,185,129,0.5)] hover:from-brand-300 hover:to-brand-500",
        secondary:
          "bg-ink-700/70 text-zinc-100 dark:bg-white/10 dark:text-white hover:bg-ink-600/70 dark:hover:bg-white/15 border border-white/5 dark:border-white/10 backdrop-blur",
        ghost:
          "text-zinc-700 dark:text-zinc-300 hover:bg-black/5 dark:hover:bg-white/8",
        danger:
          "bg-gradient-to-b from-rose-500 to-rose-600 text-white shadow-[0_4px_20px_-4px_rgba(244,63,94,0.5)] hover:from-rose-400 hover:to-rose-500",
        gold:
          "bg-gradient-to-b from-gold-300 to-gold-500 text-ink-900 shadow-[0_4px_20px_-4px_rgba(245,185,68,0.6)] hover:from-gold-300 hover:to-gold-400",
        outline:
          "border border-zinc-300 dark:border-white/15 text-zinc-800 dark:text-zinc-200 hover:bg-black/5 dark:hover:bg-white/5",
      },
      size: {
        sm: "h-9 px-3.5 text-sm",
        md: "h-11 px-5 text-sm",
        lg: "h-12 px-7 text-base",
        xl: "h-14 px-8 text-base",
      },
      full: { true: "w-full" },
    },
    defaultVariants: { variant: "primary", size: "md" },
  }
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  loading?: boolean;
  /** Link гэх мэт нэг child руу button style шилжүүлэх */
  asChild?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, full, loading, disabled, children, asChild, ...props }, ref) => {
    const classes = cn(buttonVariants({ variant, size, full }), className);

    if (asChild && isValidElement(children)) {
      const child = children as ReactElement<{ className?: string }>;
      return cloneElement(child, {
        className: cn(classes, child.props.className),
      });
    }

    return (
      <button
        ref={ref}
        className={classes}
        disabled={disabled || loading}
        {...props}
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
        {children}
      </button>
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
