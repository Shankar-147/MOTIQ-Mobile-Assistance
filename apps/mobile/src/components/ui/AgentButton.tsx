import React, { useEffect, useRef } from "react";
import { Animated, Easing, Pressable, Text, View } from "react-native";
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg";
import { MIN_TOUCH_TARGET_SIZE } from "../../accessibility/a11y";
import { COLORS, FONTS } from "../../theme/colors";

const AnimatedRect = Animated.createAnimatedComponent(Rect);

const WIDTH = 64;
const HEIGHT = Math.max(44, MIN_TOUCH_TARGET_SIZE);
const RADIUS = HEIGHT / 2;
const STROKE = 2.5;
const GLOW_STROKE = 7;

// One pulse: the whole ring glows for a few seconds with a highlight sweeping around it, then the
// button rests for a while before the next pulse.
const RUN_MS = 3000;
const REST_MS = 10000;

// The ring runs along a rounded rectangle inset by half the glow stroke, so work out its length.
const INSET = GLOW_STROKE / 2;
const RECT_W = WIDTH - INSET * 2;
const RECT_H = HEIGHT - INSET * 2;
const RECT_R = RADIUS - INSET;
const PERIMETER = 2 * (RECT_W - 2 * RECT_R) + 2 * (RECT_H - 2 * RECT_R) + 2 * Math.PI * RECT_R;
const SWEEP = PERIMETER * 0.28; // the bright highlight that travels around the lit ring

interface AgentButtonProps {
  onPress: () => void;
  accessibilityLabel?: string;
}

/**
 * The entry point to the AI agent: a small "IQ" pill. Every ~13 seconds a glowing green gradient
 * ring lights up the whole border for about 3 seconds, with a highlight sweeping once around it,
 * then fades out — so it reads as "alive" without being a constant distraction.
 * Animated on the JS thread (SVG props can't use the native driver); it is one small element.
 */
export function AgentButton({ onPress, accessibilityLabel = "Ask IQ, the MOTIQ AI assistant" }: AgentButtonProps) {
  const run = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(run, { toValue: 1, duration: RUN_MS, easing: Easing.linear, useNativeDriver: false }),
        Animated.delay(REST_MS),
        // Jump back to the start while the ring is invisible (its opacity is 0 at both ends).
        Animated.timing(run, { toValue: 0, duration: 0, useNativeDriver: false }),
      ]),
    );
    pulse.start();
    return () => pulse.stop();
  }, [run]);

  const offset = run.interpolate({ inputRange: [0, 1], outputRange: [0, -PERIMETER] });
  // Fade in at the start of the run, hold, fade out at the end: the ring is fully off between pulses.
  const envelope = [0, 0.12, 0.85, 1];
  const ringOpacity = run.interpolate({ inputRange: envelope, outputRange: [0, 0.9, 0.9, 0] });
  const glowOpacity = run.interpolate({ inputRange: envelope, outputRange: [0, 0.4, 0.4, 0] });
  const sweepOpacity = run.interpolate({ inputRange: envelope, outputRange: [0, 1, 1, 0] });

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={({ pressed }) => ({ width: WIDTH, height: HEIGHT, opacity: pressed ? 0.85 : 1 })}
    >
      <View
        style={{
          width: WIDTH,
          height: HEIGHT,
          borderRadius: RADIUS,
          backgroundColor: COLORS.surfaceRaised,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Svg width={WIDTH} height={HEIGHT} style={{ position: "absolute", top: 0, left: 0 }}>
          <Defs>
            {/* MOTIQ greens: deep green, signal green, mint, teal */}
            <LinearGradient id="agentRing" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor="#0FA968" />
              <Stop offset="0.35" stopColor="#22E58B" />
              <Stop offset="0.7" stopColor="#8CFFC9" />
              <Stop offset="1" stopColor="#19D3C5" />
            </LinearGradient>
          </Defs>
          {/* the resting outline */}
          <Rect x={INSET} y={INSET} width={RECT_W} height={RECT_H} rx={RECT_R} ry={RECT_R} fill="none" stroke={COLORS.border} strokeWidth={1.5} />
          {/* soft glow behind the ring (whole border) */}
          <AnimatedRect
            x={INSET}
            y={INSET}
            width={RECT_W}
            height={RECT_H}
            rx={RECT_R}
            ry={RECT_R}
            fill="none"
            stroke="url(#agentRing)"
            strokeWidth={GLOW_STROKE}
            opacity={glowOpacity}
          />
          {/* the gradient ring (whole border) */}
          <AnimatedRect
            x={INSET}
            y={INSET}
            width={RECT_W}
            height={RECT_H}
            rx={RECT_R}
            ry={RECT_R}
            fill="none"
            stroke="url(#agentRing)"
            strokeWidth={STROKE}
            opacity={ringOpacity}
          />
          {/* a brighter highlight that sweeps once around the ring */}
          <AnimatedRect
            x={INSET}
            y={INSET}
            width={RECT_W}
            height={RECT_H}
            rx={RECT_R}
            ry={RECT_R}
            fill="none"
            stroke="#D9FFEE"
            strokeWidth={STROKE}
            strokeLinecap="round"
            strokeDasharray={`${SWEEP} ${PERIMETER - SWEEP}`}
            strokeDashoffset={offset}
            opacity={sweepOpacity}
          />
        </Svg>
        <Text style={{ fontFamily: FONTS.display, fontSize: 19, letterSpacing: 0.5, color: COLORS.text }}>
          I<Text style={{ color: COLORS.accent }}>Q</Text>
        </Text>
      </View>
    </Pressable>
  );
}
