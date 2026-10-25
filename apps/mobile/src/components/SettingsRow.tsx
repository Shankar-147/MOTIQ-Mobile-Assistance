import React from "react";
import { Pressable, Text, View } from "react-native";
import { ChevronRight } from "lucide-react-native";
import type { LucideIcon } from "lucide-react-native";
import { COLORS, FONTS } from "../theme/colors";

interface SettingsRowProps {
  icon: LucideIcon;
  label: string;
  value?: string;
  onPress: () => void;
  danger?: boolean;
  last?: boolean;
  accessibilityLabel?: string;
}

/** A tappable settings row (icon, label, optional current value, chevron).
 * Rows are stacked inside a `SettingsGroup`. */
export function SettingsRow({ icon: Icon, label, value, onPress, danger = false, last = false, accessibilityLabel }: SettingsRowProps) {
  const tint = danger ? COLORS.danger : COLORS.text;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? (value ? `${label}: ${value}` : label)}
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        gap: 14,
        minHeight: 56,
        paddingHorizontal: 16,
        borderBottomWidth: last ? 0 : 1,
        borderBottomColor: COLORS.border,
        opacity: pressed ? 0.8 : 1,
      })}
    >
      <View
        style={{
          width: 36,
          height: 36,
          borderRadius: 12,
          backgroundColor: danger ? "rgba(255, 77, 77, 0.14)" : COLORS.surfaceRaised,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Icon size={18} color={danger ? COLORS.danger : COLORS.accent} />
      </View>
      <Text style={{ flex: 1, fontFamily: FONTS.body, fontSize: 15.5, color: tint }}>{label}</Text>
      {value ? (
        <Text numberOfLines={1} style={{ maxWidth: "40%", fontFamily: FONTS.body, fontSize: 14, color: COLORS.textSecondary }}>
          {value}
        </Text>
      ) : null}
      {danger ? null : <ChevronRight size={18} color={COLORS.textMuted} />}
    </Pressable>
  );
}

/** Rounded card that holds a stack of `SettingsRow`s. */
export function SettingsGroup({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: 8 }}>
      {title ? (
        <Text style={{ fontFamily: FONTS.bodyBold, fontSize: 12.5, letterSpacing: 0.6, color: COLORS.textSecondary, textTransform: "uppercase", paddingHorizontal: 4 }}>
          {title}
        </Text>
      ) : null}
      <View style={{ backgroundColor: COLORS.surface, borderRadius: 22, borderWidth: 1, borderColor: COLORS.border, overflow: "hidden" }}>
        {children}
      </View>
    </View>
  );
}
