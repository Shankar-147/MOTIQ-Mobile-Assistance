import React from "react";
import { Badge as GSBadge, BadgeText } from "@gluestack-ui/themed";
import { COLORS } from "../../theme/colors";

export type BadgeTone = "info" | "success" | "warning" | "danger" | "neutral";

const TONE: Record<BadgeTone, { bg: string; fg: string }> = {
  info: { bg: "rgba(96, 165, 250, 0.16)", fg: "#7DB5FF" },
  success: { bg: COLORS.accentTint, fg: COLORS.accent },
  warning: { bg: "rgba(255, 184, 77, 0.16)", fg: COLORS.warning },
  danger: { bg: "rgba(255, 77, 77, 0.16)", fg: COLORS.danger },
  neutral: { bg: COLORS.surfaceRaised, fg: COLORS.textSecondary },
};

/** The project's one status pill — every status/tier label (request status,
 * verification tier, payment status, document review status) routes through
 * this instead of a hand-rolled colored `Text`. */
export function Badge({ label, tone = "neutral" }: { label: string; tone?: BadgeTone }) {
  const t = TONE[tone];
  return (
    <GSBadge action="muted" variant="solid" bg={t.bg} borderRadius="$full" px="$3" py="$1" borderWidth={0}>
      <BadgeText color={t.fg} textTransform="capitalize" size="xs" fontWeight="$bold">
        {label}
      </BadgeText>
    </GSBadge>
  );
}
