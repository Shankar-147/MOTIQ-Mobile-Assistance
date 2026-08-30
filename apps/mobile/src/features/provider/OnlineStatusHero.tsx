import React, { useEffect } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  Easing,
  cancelAnimation,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { Power, Zap } from "lucide-react-native";
import { COLORS, FONTS } from "../../theme/colors";

interface OnlineStatusHeroProps {
  online: boolean;
  submitting: boolean;
  onToggle: () => void;
}

const PULSE_DURATION_MS = 2200;

/**
 * The Provider Home redesign's hero (see the "Provider Home Redesign" design
 * canvas this was mocked up from — a mix of its two directions: the light
 * indigo-gradient card from "Electric Indigo," with the "Midnight Ops"
 * direction's neon-lime accent for the online pulse/toggle instead of that
 * option's cyan). Two Reanimated-driven motions, matching the canvas's
 * annotated motion intent:
 *  - Two phase-offset rings pulse outward on a ~2.2s loop while online — a
 *    "radar heartbeat" — and stop entirely (not just fade) the instant the
 *    provider goes offline, so it never reads as decorative background noise.
 *  - The toggle pill's fill color smoothly morphs (not a snap) between white
 *    and lime as the state actually changes, with a spring press-scale for
 *    tactile feedback — makes the state change feel physical, not a re-render.
 */
export function OnlineStatusHero({ online, submitting, onToggle }: OnlineStatusHeroProps) {
  const pulse1 = useSharedValue(0);
  const pulse2 = useSharedValue(0);
  const toggleProgress = useSharedValue(online ? 1 : 0);
  const pressScale = useSharedValue(1);

  useEffect(() => {
    if (online) {
      pulse1.value = withRepeat(
        withTiming(1, { duration: PULSE_DURATION_MS, easing: Easing.out(Easing.quad) }),
        -1,
        false,
      );
      pulse2.value = withDelay(
        PULSE_DURATION_MS / 2,
        withRepeat(withTiming(1, { duration: PULSE_DURATION_MS, easing: Easing.out(Easing.quad) }), -1, false),
      );
    } else {
      cancelAnimation(pulse1);
      cancelAnimation(pulse2);
      pulse1.value = 0;
      pulse2.value = 0;
    }
  }, [online, pulse1, pulse2]);

  useEffect(() => {
    toggleProgress.value = withTiming(online ? 1 : 0, { duration: 260 });
  }, [online, toggleProgress]);

  const ring1Style = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + pulse1.value * 0.45 }],
    opacity: (1 - pulse1.value) * 0.55,
  }));
  const ring2Style = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + pulse2.value * 0.45 }],
    opacity: (1 - pulse2.value) * 0.55,
  }));
  const pillStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(toggleProgress.value, [0, 1], [COLORS.surface, COLORS.electric]),
    transform: [{ scale: pressScale.value }],
  }));
  const pillTextStyle = useAnimatedStyle(() => ({
    color: interpolateColor(toggleProgress.value, [0, 1], [COLORS.primaryDark, "#14290A"]),
  }));

  return (
    <LinearGradient
      colors={[COLORS.primary, COLORS.primaryDark, COLORS.primaryDeep]}
      start={{ x: 0.1, y: 0 }}
      end={{ x: 0.9, y: 1 }}
      style={styles.card}
    >
      <View style={styles.ringLayer} pointerEvents="none">
        <Animated.View style={[styles.ring, styles.ringOuter, ring1Style]} />
        <Animated.View style={[styles.ring, styles.ringInner, ring2Style]} />
        <View style={styles.ringGlow} />
      </View>

      <View style={styles.statusRow}>
        <View style={[styles.statusDot, { backgroundColor: online ? COLORS.electric : "#8B87A6" }]} />
        <Text style={[styles.statusLabel, { color: online ? COLORS.electric : "#C7D2FE" }]}>
          {online ? "LIVE · SEARCHING FOR JOBS" : "OFFLINE"}
        </Text>
      </View>

      <Text style={styles.heading}>{online ? "You're online" : "You're offline"}</Text>
      <Text style={styles.subtext}>
        {online
          ? "New offers arrive instantly — keep the app open so you never miss one."
          : "Go online to start receiving job offers nearby."}
      </Text>

      <View style={styles.actionsRow}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={online ? "Go offline" : "Go online"}
          disabled={submitting}
          onPressIn={() => {
            pressScale.value = withSpring(0.96, { damping: 14 });
          }}
          onPressOut={() => {
            pressScale.value = withSpring(1, { damping: 10 });
          }}
          onPress={onToggle}
          style={styles.pillWrap}
        >
          <Animated.View style={[styles.pill, pillStyle, submitting && styles.pillDisabled]}>
            <Power size={17} color={online ? "#14290A" : COLORS.primaryDark} strokeWidth={2.3} />
            <Animated.Text style={[styles.pillText, pillTextStyle]}>
              {submitting ? "Updating…" : online ? "Go offline" : "Go online"}
            </Animated.Text>
          </Animated.View>
        </Pressable>
        <View style={styles.zapBadge}>
          <Zap size={19} color="#FFFFFF" fill="#FFFFFF" />
        </View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 26,
    padding: 24,
    paddingBottom: 22,
    overflow: "hidden",
    shadowColor: COLORS.primaryDark,
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.35,
    shadowRadius: 28,
    elevation: 10,
  },
  ringLayer: { position: "absolute", right: -10, top: -10, width: 160, height: 160 },
  ring: { position: "absolute", borderRadius: 999, borderWidth: 1.5, borderColor: "rgba(255,255,255,0.5)" },
  ringOuter: { width: 140, height: 140, right: 10, top: 10 },
  ringInner: { width: 100, height: 100, right: 30, top: 30 },
  ringGlow: {
    position: "absolute",
    width: 80,
    height: 80,
    right: 40,
    top: 40,
    borderRadius: 999,
    backgroundColor: COLORS.electricGlow,
  },
  statusRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  statusDot: { width: 9, height: 9, borderRadius: 5 },
  statusLabel: { fontFamily: FONTS.bodyBold, fontSize: 11.5, letterSpacing: 1 },
  heading: { fontFamily: FONTS.display, fontSize: 26, color: "#FFFFFF", marginTop: 10 },
  subtext: { fontFamily: FONTS.bodyRegular, fontSize: 13.5, color: "#C7D2FE", marginTop: 4, maxWidth: 250, lineHeight: 19 },
  actionsRow: { flexDirection: "row", alignItems: "center", gap: 12, marginTop: 22 },
  pillWrap: { flex: 1 },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
    borderRadius: 999,
    paddingVertical: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 14,
    elevation: 6,
  },
  pillDisabled: { opacity: 0.7 },
  pillText: { fontFamily: FONTS.bodyBold, fontSize: 14.5 },
  zapBadge: {
    width: 48,
    height: 48,
    borderRadius: 15,
    backgroundColor: "rgba(255,255,255,0.16)",
    alignItems: "center",
    justifyContent: "center",
  },
});
