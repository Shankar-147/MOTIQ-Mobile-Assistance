import React, { useEffect } from "react";
import type { DimensionValue } from "react-native";
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { COLORS } from "../../theme/colors";

interface SkeletonProps {
  width?: DimensionValue;
  height?: number;
  radius?: number;
}

/** Shimmering placeholder block used in place of spinners; a static block
 * under reduce-motion. */
export function Skeleton({ width = "100%", height = 16, radius = 12 }: SkeletonProps) {
  const reduceMotion = useReducedMotion();
  const opacity = useSharedValue(0.5);

  useEffect(() => {
    if (reduceMotion) return;
    opacity.value = withRepeat(withTiming(0.9, { duration: 800 }), -1, true);
  }, [reduceMotion, opacity]);

  const animatedStyle = useAnimatedStyle(() => ({ opacity: reduceMotion ? 0.7 : opacity.value }));

  return (
    <Animated.View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[{ width, height, borderRadius: radius, backgroundColor: COLORS.surfaceRaised }, animatedStyle]}
    />
  );
}
