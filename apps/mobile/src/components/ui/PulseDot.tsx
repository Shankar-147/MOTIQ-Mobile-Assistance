import React, { useEffect } from "react";
import { View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { COLORS } from "../../theme/colors";

/** The "live" dot — a solid dot with an expanding halo (static halo under
 * reduce-motion). */
export function PulseDot({ color = COLORS.accent }: { color?: string }) {
  const reduceMotion = useReducedMotion();
  const progress = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion) return;
    progress.value = withRepeat(withTiming(1, { duration: 1400 }), -1, false);
  }, [reduceMotion, progress]);

  const halo = useAnimatedStyle(() => ({
    opacity: reduceMotion ? 0.25 : 0.5 * (1 - progress.value),
    transform: [{ scale: reduceMotion ? 1.6 : 1 + progress.value * 1.4 }],
  }));

  return (
    <View style={{ width: 16, height: 16, alignItems: "center", justifyContent: "center" }} accessibilityElementsHidden>
      <Animated.View style={[{ position: "absolute", width: 8, height: 8, borderRadius: 4, backgroundColor: color }, halo]} />
      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color }} />
    </View>
  );
}
