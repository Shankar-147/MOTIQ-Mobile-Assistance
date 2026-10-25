import { cn } from "@/lib/cn";

type Tone = "success" | "warning" | "danger" | "neutral" | "primary";

const TONE_CLASSES: Record<Tone, string> = {
  success: "bg-success/10 text-success",
  warning: "bg-warning/10 text-warning",
  danger: "bg-danger/10 text-danger",
  neutral: "bg-slate-100 text-slate-600",
  primary: "bg-primary/10 text-primary",
};

export function Badge({ tone = "neutral", children }: { tone?: Tone; children: React.ReactNode }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-pill px-2.5 py-1 text-xs font-semibold uppercase tracking-wide",
        TONE_CLASSES[tone],
      )}
    >
      {children}
    </span>
  );
}

/**
 * Maps the status enums already used across the console (SosAlertStatus,
 * ProviderVerificationStatus, AssignmentStatus, PaymentStatus, ...) to a
 * consistent tone so a reviewer learns the color language once.
 */
export function statusTone(status: string): Tone {
  const positive = ["RESOLVED", "FULLY_VERIFIED", "APPROVED", "CAPTURED", "ACCEPTED", "COMPLETED", "ACTIVE"];
  const warn = ["ACKNOWLEDGED", "TRIGGERED", "PROVISIONAL", "PENDING", "AUTHORIZED", "DISPATCHED"];
  const bad = ["SUSPENDED", "DELISTED", "REJECTED", "FAILED", "CANCELLED", "EXPIRED"];
  if (positive.includes(status)) return "success";
  if (warn.includes(status)) return "warning";
  if (bad.includes(status)) return "danger";
  return "neutral";
}
