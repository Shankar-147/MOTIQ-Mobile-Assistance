import { cn } from "@/lib/cn";
import type { TableHTMLAttributes } from "react";

/**
 * Fixes the horizontal-overflow bug seen on the old audit-log/SOS tables
 * (last column cut off with no scroll affordance): a bordered, rounded
 * wrapper that scrolls on its own and makes that scrollability visible,
 * rather than letting the table silently blow out of the page.
 */
export function Table({ className, ...props }: TableHTMLAttributes<HTMLTableElement>) {
  return (
    <div className="overflow-x-auto rounded-card border border-slate-200/80 bg-surface shadow-card [&_tbody_tr]:transition-colors [&_tbody_tr]:hover:bg-slate-50/80">
      <table className={cn("w-full min-w-[640px] text-left text-sm", className)} {...props} />
    </div>
  );
}

export function Th({ className, ...props }: React.ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      className={cn(
        "border-b border-slate-200 bg-slate-50/80 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500",
        className,
      )}
      {...props}
    />
  );
}

export function Td({ className, ...props }: React.TdHTMLAttributes<HTMLTableCellElement>) {
  return (
    <td
      className={cn("border-b border-slate-100 px-4 py-3 align-middle text-slate-700 last:border-b-0", className)}
      {...props}
    />
  );
}
