import Link from "next/link";
import { cn } from "@/lib/cn";

export function StatCard({
  label,
  value,
  href,
  tone = "default",
  trend,
}: {
  label: string;
  value: React.ReactNode;
  href?: string;
  tone?: "default" | "danger";
  trend?: { direction: "up" | "down"; percent: number };
}) {
  const content = (
    <>
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <div className="mt-2 flex items-baseline gap-2">
        <p
          className={cn(
            "font-display text-3xl font-bold",
            tone === "danger" ? "text-danger" : "text-slate-900",
          )}
        >
          {value}
        </p>
        {trend ? (
          <span
            className={cn(
              "text-xs font-semibold",
              trend.direction === "up" ? "text-success" : "text-danger",
            )}
          >
            {trend.direction === "up" ? "↑" : "↓"} {trend.percent}%
          </span>
        ) : null}
      </div>
    </>
  );

  const className = cn(
    "rounded-card border border-slate-200/80 bg-surface p-5 shadow-card transition-all",
    href && "hover:-translate-y-0.5 hover:shadow-card-hover",
  );

  if (href) {
    return (
      <Link href={href} className={className}>
        {content}
      </Link>
    );
  }
  return <div className={className}>{content}</div>;
}
