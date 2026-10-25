import React from "react";
import { Pressable, Text, View } from "react-native";
import { ChevronRight } from "lucide-react-native";
import { AssignmentStatus, IssueType } from "@motiq/types";
import { Badge } from "./ui";
import { ISSUE_ICONS, ISSUE_LABELS } from "../theme/issueIcons";
import { COLORS, FONTS } from "../theme/colors";
import { ASSIGNMENT_STATUS_TONE } from "../features/provider/assignmentBadgeTone";

const STATUS_LABEL: Record<AssignmentStatus, string> = {
  [AssignmentStatus.OFFERED]: "Offered",
  [AssignmentStatus.ACCEPTED]: "Accepted",
  [AssignmentStatus.REJECTED]: "Declined",
  [AssignmentStatus.TIMED_OUT]: "Missed",
  [AssignmentStatus.SUPERSEDED]: "Reassigned",
};

interface JobCardProps {
  issueType: IssueType;
  status: AssignmentStatus;
  distanceMeters?: number | null;
  timeLabel: string;
  onPress?: () => void;
}

function distanceLabel(meters?: number | null): string | null {
  if (meters == null) return null;
  return meters < 1000 ? `${Math.round(meters)} m away` : `${(meters / 1000).toFixed(1)} km away`;
}

/** One assignment in the provider's job lists: issue icon, issue, distance,
 * time and an assignment-status badge. Mirrors the customer `RequestCard`. */
export function JobCard({ issueType, status, distanceMeters, timeLabel, onPress }: JobCardProps) {
  const Icon = ISSUE_ICONS[issueType];
  const distance = distanceLabel(distanceMeters);
  const active = status === AssignmentStatus.OFFERED || status === AssignmentStatus.ACCEPTED;
  return (
    <Pressable
      accessibilityRole={onPress ? "button" : undefined}
      accessibilityLabel={`${ISSUE_LABELS[issueType]} job, ${STATUS_LABEL[status]}, ${timeLabel}`}
      disabled={!onPress}
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        gap: 14,
        minHeight: 72,
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
        <Text style={{ fontFamily: FONTS.display, fontSize: 16, color: COLORS.text }}>{ISSUE_LABELS[issueType]}</Text>
        {distance ? (
          <Text numberOfLines={1} style={{ fontFamily: FONTS.body, fontSize: 13, color: COLORS.textSecondary }}>
            {distance}
          </Text>
        ) : null}
        <Text numberOfLines={1} style={{ fontFamily: FONTS.body, fontSize: 12.5, color: COLORS.textMuted }}>
          {timeLabel}
        </Text>
      </View>
      <Badge label={STATUS_LABEL[status]} tone={ASSIGNMENT_STATUS_TONE[status]} />
      {onPress ? <ChevronRight size={18} color={COLORS.textMuted} /> : null}
    </Pressable>
  );
}
