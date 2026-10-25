import { cn } from "@/lib/cn";
import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "danger" | "success" | "ghost";
type Size = "sm" | "md";

const VARIANT_CLASSES: Record<Variant, string> = {
  primary: "bg-primary text-white hover:bg-primary-dark disabled:bg-primary/40 shadow-card",
  secondary:
    "bg-white text-slate-700 border border-slate-200 hover:border-slate-300 hover:bg-slate-50 disabled:text-slate-300",
  danger: "bg-danger text-white hover:bg-danger-dark disabled:bg-danger/40",
  success: "bg-success text-white hover:bg-success/90 disabled:bg-success/40",
  ghost: "text-slate-600 hover:bg-slate-100 disabled:text-slate-300",
};

// No tailwind-merge in this project (CLAUDE.md: no unnecessary dependencies),
// so size/variant live as their own exclusive class sets rather than being
// overridden via `className` — two utility classes for the same property
// both landing in the output is a real, order-dependent bug, not harmless.
const SIZE_CLASSES: Record<Size, string> = {
  sm: "px-3 py-1.5 text-xs",
  md: "px-4 py-2.5 text-sm",
};

export function Button({
  variant = "primary",
  size = "md",
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size }) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-colors disabled:cursor-not-allowed",
        SIZE_CLASSES[size],
        VARIANT_CLASSES[variant],
        className,
      )}
      {...props}
    />
  );
}
