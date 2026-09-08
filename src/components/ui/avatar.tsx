import { cn, avatarGradient, initialsOf } from "@/lib/utils";

export interface AvatarProps {
  name: string;
  src?: string | null;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  className?: string;
}

const sizes = {
  xs: "h-6 w-6 text-[9px]",
  sm: "h-8 w-8 text-[11px]",
  md: "h-10 w-10 text-sm",
  lg: "h-14 w-14 text-lg",
  xl: "h-20 w-20 text-2xl",
};

/** Зураггүй бол gradient + initials — гадаад image dependency байхгүй */
export function Avatar({ name, src, size = "md", className }: AvatarProps) {
  if (src) {
    return (
      <img
        src={src}
        alt={name}
        className={cn("rounded-full object-cover ring-2 ring-black/5 dark:ring-white/10", sizes[size], className)}
      />
    );
  }
  return (
    <div
      className={cn(
        "flex items-center justify-center rounded-full bg-gradient-to-br font-semibold text-white ring-2 ring-black/5 dark:ring-white/10",
        avatarGradient(name),
        sizes[size],
        className
      )}
      aria-label={name}
    >
      {initialsOf(name)}
    </div>
  );
}
