import React from "react";
import { Text, View } from "react-native";
import { COLORS, FONTS } from "../../theme/colors";

interface StatBlockProps {
  label: string;
  value: string;
  accent?: boolean;
}

/** A small label above a hero numeral. The numeral shrinks to fit rather
 * than clipping at large system font sizes. */
export function StatBlock({ label, value, accent = false }: StatBlockProps) {
  return (
    <View accessible accessibilityLabel={`${label}: ${value}`}>
      <Text style={{ fontFamily: FONTS.body, fontSize: 13, color: COLORS.textSecondary }}>{label}</Text>
      <Text
        numberOfLines={1}
        adjustsFontSizeToFit
        style={{
          fontFamily: FONTS.display,
          fontSize: 44,
          lineHeight: 52,
          letterSpacing: -1,
          color: accent ? COLORS.accent : COLORS.text,
        }}
      >
        {value}
      </Text>
    </View>
  );
}
