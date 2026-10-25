import React from "react";
import { View } from "react-native";
import { COLORS } from "../../theme/colors";

/** Segmented progress bar; `current` is 1-based, done and current segments
 * are accent-filled. */
export function StepIndicator({ total, current }: { total: number; current: number }) {
  return (
    <View
      accessible
      accessibilityLabel={`Step ${current} of ${total}`}
      style={{ flexDirection: "row", gap: 4 }}
    >
      {Array.from({ length: total }, (_, i) => (
        <View
          key={i}
          style={{
            flex: 1,
            height: 4,
            borderRadius: 2,
            backgroundColor: i < current ? COLORS.accent : COLORS.border,
          }}
        />
      ))}
    </View>
  );
}
