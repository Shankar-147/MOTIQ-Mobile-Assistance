import React from "react";
import { StyleSheet, Text, View } from "react-native";
import type { LucideIcon } from "lucide-react-native";
import { COLORS, FONTS, SHADOW } from "../../theme/colors";
import { useCountUp } from "../../hooks/useCountUp";

interface StatChipProps {
  icon: LucideIcon;
  iconColor: string;
  iconBg: string;
  /** The number to animate up to. Formatted with `format` after rounding —
   * count-up interpolates the raw number, not the formatted string. */
  value: number;
  format?: (roundedValue: number) => string;
  label: string;
}

/** One of the Provider Home redesign's three stat cards (rating, jobs done,
 * this week's earnings) — replaces the old screen's bare tab labels with no
 * visible numbers. The value counts up from 0 on mount/refresh (useCountUp)
 * rather than popping in static, per the design canvas's annotated motion. */
export function StatChip({ icon: Icon, iconColor, iconBg, value, format, label }: StatChipProps) {
  const animated = useCountUp(value);
  const display = format ? format(animated) : String(Math.round(animated));

  return (
    <View style={styles.card}>
      <View style={[styles.iconBadge, { backgroundColor: iconBg }]}>
        <Icon size={15} color={iconColor} strokeWidth={2.1} />
      </View>
      <View>
        <Text style={styles.value}>{display}</Text>
        <Text style={styles.label}>{label}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    padding: 13,
    gap: 8,
    ...SHADOW,
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 1,
  },
  iconBadge: { width: 30, height: 30, borderRadius: 9, alignItems: "center", justifyContent: "center" },
  value: { fontFamily: FONTS.display, fontSize: 17, color: COLORS.textPrimary },
  label: { fontFamily: FONTS.bodyRegular, fontSize: 11, color: COLORS.textMuted, marginTop: 1 },
});
