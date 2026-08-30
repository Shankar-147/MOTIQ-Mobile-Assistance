import React from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { AssignmentStatus, IssueType } from "@motiq/types";
import { ISSUE_ICONS } from "../../theme/issueIcons";
import { COLORS, FONTS, SHADOW } from "../../theme/colors";

const STATUS_ACCENT: Record<AssignmentStatus, { bar: string; badgeBg: string; text: string; label: string }> = {
  [AssignmentStatus.OFFERED]: { bar: COLORS.warning, badgeBg: "#FEF3C7", text: COLORS.warning, label: "OFFERED" },
  [AssignmentStatus.ACCEPTED]: { bar: COLORS.success, badgeBg: "#DCFCE7", text: COLORS.success, label: "ACCEPTED" },
  [AssignmentStatus.REJECTED]: { bar: COLORS.textMuted, badgeBg: "#F1F0F7", text: COLORS.textMuted, label: "DECLINED" },
  [AssignmentStatus.TIMED_OUT]: { bar: COLORS.textMuted, badgeBg: "#F1F0F7", text: COLORS.textMuted, label: "TIMED OUT" },
  [AssignmentStatus.SUPERSEDED]: { bar: COLORS.textMuted, badgeBg: "#F1F0F7", text: COLORS.textMuted, label: "REASSIGNED" },
};

interface RecentJobRowProps {
  issueType: IssueType;
  status: AssignmentStatus;
  relativeTime: string;
  index: number;
}

/**
 * One row in the Provider Home redesign's "Recent jobs" list — a colored
 * left accent bar + issue-type icon badge + status pill, replacing the old
 * plain-text row. Fades + slides in on mount, staggered by `index` (~60ms
 * apart, per the design canvas's annotated motion) via Reanimated's built-in
 * `FadeInDown` layout animation — no custom worklet needed for this one.
 */
export function RecentJobRow({ issueType, status, relativeTime, index }: RecentJobRowProps) {
  const Icon = ISSUE_ICONS[issueType];
  const accent = STATUS_ACCENT[status];

  return (
    <Animated.View
      entering={FadeInDown.delay(index * 60).duration(320)}
      style={styles.row}
    >
      <View style={[styles.accentBar, { backgroundColor: accent.bar }]} />
      <View style={[styles.iconBadge, { backgroundColor: accent.badgeBg }]}>
        <Icon size={17} color={accent.text} strokeWidth={1.8} />
      </View>
      <View style={styles.textCol}>
        <Text style={styles.title}>{issueType.replace(/_/g, " ").toLowerCase()}</Text>
        <Text style={styles.time}>{relativeTime}</Text>
      </View>
      <View style={[styles.statusPill, { backgroundColor: accent.badgeBg }]}>
        <Text style={[styles.statusText, { color: accent.text }]}>{accent.label}</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 13,
    ...SHADOW,
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 1,
  },
  accentBar: { width: 4, alignSelf: "stretch", borderRadius: 3 },
  iconBadge: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  textCol: { flex: 1 },
  title: { fontFamily: FONTS.bodyBold, fontSize: 13.5, color: COLORS.textPrimary, textTransform: "capitalize" },
  time: { fontFamily: FONTS.bodyRegular, fontSize: 11.5, color: COLORS.textMuted, marginTop: 1 },
  statusPill: { borderRadius: 999, paddingVertical: 5, paddingHorizontal: 10 },
  statusText: { fontFamily: FONTS.bodyBold, fontSize: 10.5 },
});
