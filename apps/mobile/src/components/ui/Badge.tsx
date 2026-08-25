import React from "react";
import { Badge as GSBadge, BadgeText } from "@gluestack-ui/themed";

export type BadgeTone = "info" | "success" | "warning" | "danger" | "neutral";

const ACTION_MAP: Record<BadgeTone, "info" | "success" | "warning" | "error" | "muted"> = {
  info: "info",
  success: "success",
  warning: "warning",
  danger: "error",
  neutral: "muted",
};

/** The project's one status pill — every status/tier label (request status,
 * verification tier, payment status, document review status) routes through
 * this instead of a hand-rolled colored `Text`. */
export function Badge({ label, tone = "neutral" }: { label: string; tone?: BadgeTone }) {
  return (
    <GSBadge action={ACTION_MAP[tone]} variant="solid" borderRadius="$full" px="$3" py="$1">
      <BadgeText textTransform="capitalize" size="xs">
        {label}
      </BadgeText>
    </GSBadge>
  );
}
