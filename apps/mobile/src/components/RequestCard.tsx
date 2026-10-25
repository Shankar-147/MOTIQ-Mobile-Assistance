import React from "react";
import { Pressable, Text, View } from "react-native";
import { ChevronRight } from "lucide-react-native";
import { IssueType, RequestStatus } from "@motiq/types";
import { Badge } from "./ui";
import { PulseDot } from "./ui/PulseDot";
import { ISSUE_ICONS, ISSUE_LABELS } from "../theme/issueIcons";
import { COLORS, FONTS } from "../theme/colors";
import { statusBadgeTone } from "../features/customer/statusBadgeTone";

interface RequestCardProps {
  issueType: IssueType;
  status: RequestStatus;
  vehicleLabel?: string | null;
  timeLabel: string;
  active?: boolean;
  onPress: () => void;
}

/** One request in the Requests list: issue icon, issue + vehicle, status and
 * time. Active requests get an accent border and a live dot. */
export function RequestCard({ issueType, status, vehicleLabel, timeLabel, active = false, onPress }: RequestCardProps) {
  const Icon = ISSUE_ICONS[issueType];
  const statusText = status.replace(/_/g, " ").toLowerCase();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${ISSUE_LABELS[issueType]} request, ${statusText}, ${timeLabel}`}
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        gap: 14,
        minHeight: 76,
        padding: 14,
        borderRadius: 22,
        borderWidth: 1,
        borderColor: active ? COLORS.accent : COLORS.border,
        backgroundColor: COLORS.surface,
        opacity: pressed ? 0.85 : 1,
      })}
    >
      <View
        style={{
          width: 48,
          height: 48,
          borderRadius: 24,
          backgroundColor: active ? COLORS.accent : COLORS.surfaceRaised,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Icon size={22} color={active ? COLORS.accentInk : COLORS.text} />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          {active ? <PulseDot /> : null}
          <Text style={{ fontFamily: FONTS.display, fontSize: 16, color: COLORS.text }}>{ISSUE_LABELS[issueType]}</Text>
        </View>
        {vehicleLabel ? (
          <Text numberOfLines={1} style={{ fontFamily: FONTS.body, fontSize: 13, color: COLORS.textSecondary }}>
            {vehicleLabel}
          </Text>
        ) : null}
        <Text numberOfLines={1} style={{ fontFamily: FONTS.body, fontSize: 12.5, color: COLORS.textMuted }}>
          {timeLabel}
        </Text>
      </View>
      <View style={{ alignItems: "flex-end", gap: 6 }}>
        <Badge label={statusText} tone={statusBadgeTone(status)} />
      </View>
      <ChevronRight size={18} color={COLORS.textMuted} />
    </Pressable>
  );
}
