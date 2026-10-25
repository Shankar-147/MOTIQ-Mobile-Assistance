import { cn } from "@/lib/cn";
import type { HTMLAttributes, ElementType } from "react";

export function Card({
  as: Tag = "div",
  className,
  ...props
}: HTMLAttributes<HTMLElement> & { as?: ElementType }) {
  return (
    <Tag
      className={cn("rounded-card border border-slate-200/80 bg-surface p-5 shadow-card", className)}
      {...props}
    />
  );
}
