import React from "react";
import { Text, View } from "react-native";
import { COLORS, FONTS } from "../../theme/colors";

/** Title + one line of context at the top of a form or detail screen. */
export function ScreenHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <View style={{ gap: 6 }}>
      <Text accessibilityRole="header" style={{ fontFamily: FONTS.display, fontSize: 28, lineHeight: 34, color: COLORS.text }}>
        {title}
      </Text>
      {subtitle ? (
        <Text style={{ fontFamily: FONTS.body, fontSize: 15, lineHeight: 22, color: COLORS.textSecondary }}>{subtitle}</Text>
      ) : null}
    </View>
  );
}

/** The small caps-free label above a group of controls or a list. */
export function SectionLabel({ children }: { children: string }) {
  return (
    <Text style={{ fontFamily: FONTS.bodyBold, fontSize: 13, color: COLORS.textSecondary, letterSpacing: 0.3 }}>{children}</Text>
  );
}
