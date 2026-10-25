import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, LayoutChangeEvent, PanResponder, Text, View } from "react-native";
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withSpring, withTiming } from "react-native-reanimated";
import { ChevronsRight } from "lucide-react-native";
import { COLORS, FONTS } from "../../theme/colors";

interface SlideToConfirmProps {
  label: string;
  onConfirm: () => void;
  disabled?: boolean;
  loading?: boolean;
  tone?: "accent" | "danger";
}

const TRACK_HEIGHT = 56;
const THUMB = 48;
const PAD = 4;
const CONFIRM_RATIO = 0.85;

/** Drag-to-confirm control for actions that should not fire on a stray tap
 * (going online/offline, advancing a job step). JS-only (PanResponder +
 * Reanimated). Screen-reader users get an "activate" action instead of a
 * drag; under reduce-motion the thumb resets without a spring. */
export function SlideToConfirm({ label, onConfirm, disabled = false, loading = false, tone = "accent" }: SlideToConfirmProps) {
  const reduceMotion = useReducedMotion();
  const color = tone === "danger" ? COLORS.danger : COLORS.accent;
  const [trackWidth, setTrackWidth] = useState(0);
  const x = useSharedValue(0);
  const confirmedRef = useRef(false);
  const startX = useRef(0);
  const maxX = Math.max(trackWidth - THUMB - PAD * 2, 0);
  const inactive = disabled || loading;

  const reset = useCallback(() => {
    confirmedRef.current = false;
    x.value = reduceMotion ? withTiming(0, { duration: 0 }) : withSpring(0, { damping: 20, stiffness: 220 });
  }, [reduceMotion, x]);

  // Re-arm once a pending action finishes, or when the label changes (the
  // action flipped, e.g. Go online -> Go offline).
  useEffect(() => {
    if (!loading) reset();
  }, [loading, label, reset]);

  const fire = useCallback(() => {
    if (confirmedRef.current || inactive) return;
    confirmedRef.current = true;
    x.value = withTiming(maxX, { duration: reduceMotion ? 0 : 120 });
    onConfirm();
  }, [inactive, maxX, onConfirm, reduceMotion, x]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => !inactive && !confirmedRef.current,
        onMoveShouldSetPanResponder: (_, g) => !inactive && Math.abs(g.dx) > 4,
        onPanResponderGrant: () => {
          startX.current = x.value;
        },
        onPanResponderMove: (_, g) => {
          x.value = Math.min(Math.max(startX.current + g.dx, 0), maxX);
        },
        onPanResponderRelease: () => {
          if (maxX > 0 && x.value >= maxX * CONFIRM_RATIO) fire();
          else reset();
        },
        onPanResponderTerminate: reset,
      }),
    [inactive, maxX, fire, reset, x],
  );

  const thumbStyle = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));
  const fillStyle = useAnimatedStyle(() => ({ width: x.value + THUMB + PAD }));

  return (
    <View
      accessible
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: inactive, busy: loading }}
      accessibilityActions={[{ name: "activate", label }]}
      onAccessibilityAction={(e) => {
        if (e.nativeEvent.actionName === "activate") fire();
      }}
      onLayout={(e: LayoutChangeEvent) => setTrackWidth(e.nativeEvent.layout.width)}
      style={{
        height: TRACK_HEIGHT,
        borderRadius: 18,
        backgroundColor: COLORS.surfaceRaised,
        borderWidth: 1,
        borderColor: COLORS.border,
        justifyContent: "center",
        overflow: "hidden",
        opacity: disabled ? 0.45 : 1,
      }}
    >
      <Animated.View
        style={[{ position: "absolute", left: 0, top: 0, bottom: 0, backgroundColor: color, opacity: 0.18 }, fillStyle]}
      />
      <Text
        numberOfLines={1}
        style={{
          fontFamily: FONTS.bodyBold,
          fontSize: 15,
          color: COLORS.text,
          textAlign: "center",
          paddingLeft: THUMB + PAD * 2,
          paddingRight: 16,
        }}
      >
        {label}
      </Text>
      <Animated.View
        {...panResponder.panHandlers}
        style={[
          {
            position: "absolute",
            left: PAD,
            width: THUMB,
            height: THUMB,
            borderRadius: 14,
            backgroundColor: color,
            alignItems: "center",
            justifyContent: "center",
          },
          thumbStyle,
        ]}
      >
        {loading ? (
          <ActivityIndicator color={tone === "danger" ? "#FFFFFF" : COLORS.accentInk} />
        ) : (
          <ChevronsRight size={22} color={tone === "danger" ? "#FFFFFF" : COLORS.accentInk} />
        )}
      </Animated.View>
    </View>
  );
}
