import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Keyboard, PanResponder, Platform, ScrollView, StyleSheet, useWindowDimensions, View } from "react-native";
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withSpring, withTiming } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { COLORS } from "../../theme/colors";

interface BottomSheetProps {
  /** Visible heights in dp, ascending. */
  snapPoints: number[];
  initialSnap?: number;
  onSnapChange?: (index: number) => void;
  children: React.ReactNode;
}

const SPRING = { damping: 22, stiffness: 220, mass: 0.9 };

/** JS-only draggable bottom sheet (Reanimated + PanResponder — no native
 * gesture library). Snaps between `snapPoints`, lifts above the keyboard so
 * inputs stay visible, and skips animation under reduce-motion. */
export function BottomSheet({ snapPoints, initialSnap = 0, onSnapChange, children }: BottomSheetProps) {
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const reduceMotion = useReducedMotion();
  const maxHeight = snapPoints[snapPoints.length - 1];
  // Keyed by value so callers can pass an inline array without re-creating the
  // gesture handler (and resetting a drag in progress) on every render.
  const snapKey = snapPoints.join(",");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const offsets = useMemo(() => snapPoints.map((h) => maxHeight - h), [snapKey, maxHeight]);

  const translateY = useSharedValue(offsets[initialSnap] ?? 0);
  const startY = useRef(0);
  const currentIndex = useRef(initialSnap);
  const [snapIndex, setSnapIndex] = useState(initialSnap);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  const animateTo = useCallback(
    (value: number) => {
      translateY.value = reduceMotion ? withTiming(value, { duration: 0 }) : withSpring(value, SPRING);
    },
    [reduceMotion, translateY],
  );

  const snapTo = useCallback(
    (index: number) => {
      currentIndex.current = index;
      setSnapIndex(index);
      animateTo(offsets[index]);
      onSnapChange?.(index);
    },
    [animateTo, offsets, onSnapChange],
  );

  // Re-snap when the snap points change (e.g. the step content grows).
  useEffect(() => {
    animateTo(offsets[Math.min(currentIndex.current, offsets.length - 1)] ?? 0);
  }, [offsets, animateTo]);

  useEffect(() => {
    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
    const show = Keyboard.addListener(showEvent, (e) => setKeyboardHeight(e.endCoordinates.height));
    const hide = Keyboard.addListener(hideEvent, () => setKeyboardHeight(0));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > 4,
        onPanResponderGrant: () => {
          startY.current = translateY.value;
        },
        onPanResponderMove: (_, g) => {
          const next = startY.current + g.dy;
          translateY.value = Math.min(Math.max(next, 0), offsets[0]);
        },
        onPanResponderRelease: (_, g) => {
          const projected = translateY.value + g.vy * 120;
          let best = 0;
          offsets.forEach((o, i) => {
            if (Math.abs(o - projected) < Math.abs(offsets[best] - projected)) best = i;
          });
          snapTo(best);
        },
      }),
    [offsets, snapTo, translateY],
  );

  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ translateY: translateY.value }] }));

  // While the keyboard is open the sheet grows to the top so the focused
  // input is never covered; it restores on dismiss.
  const keyboardOpen = keyboardHeight > 0;

  return (
    <Animated.View
      style={[
        styles.sheet,
        {
          height: keyboardOpen
            ? Math.min(maxHeight + insets.bottom, windowHeight - keyboardHeight - insets.top - 8)
            : maxHeight + insets.bottom,
          bottom: keyboardHeight,
        },
        keyboardOpen ? null : animatedStyle,
      ]}
    >
      <View {...panResponder.panHandlers} style={styles.handleArea} accessibilityRole="adjustable" accessibilityLabel="Drag to resize panel">
        <View style={styles.handle} />
      </View>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 16 + (keyboardOpen ? 0 : offsets[snapIndex] ?? 0) }}
      >
        {children}
      </ScrollView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  sheet: {
    position: "absolute",
    left: 0,
    right: 0,
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    borderColor: COLORS.border,
    overflow: "hidden",
  },
  handleArea: { alignItems: "center", paddingTop: 10, paddingBottom: 12, minHeight: 32 },
  handle: { width: 38, height: 4, borderRadius: 2, backgroundColor: "#3A3B44" },
});
