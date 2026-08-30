import React from "react";
import { View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Circle, Ellipse, Path } from "react-native-svg";
import { Wrench } from "lucide-react-native";
import { COLORS } from "../../theme/colors";

const WIDTH = 260;
const HEIGHT = 220;

/**
 * The Welcome screen's one hero graphic: a wrench badge (the provider
 * showing up) connected by a dotted route to a drop-pin (the customer's
 * location). Deliberately NOT resizable via props — every element below is
 * hand-placed on a fixed 260x220 canvas so the SVG route/pin and the
 * absolutely-positioned RN badge stay pixel-aligned; a resize prop would let
 * the two halves scale independently and drift apart, exactly the bug an
 * earlier pass of this component had.
 */
export function ToolRouteIllustration() {
  return (
    <View style={{ width: WIDTH, height: HEIGHT }}>
      <Svg width={WIDTH} height={HEIGHT} viewBox={`0 0 ${WIDTH} ${HEIGHT}`} style={{ position: "absolute", top: 0, left: 0 }}>
        <Path
          d="M78 96 C 108 62, 128 132, 168 92"
          fill="none"
          stroke="#A5B4FC"
          strokeWidth={3}
          strokeDasharray="2 10"
          strokeLinecap="round"
        />
        <Circle cx={78} cy={96} r={5} fill={COLORS.electric} />

        <Path
          d="M190 10 C208 10, 222 24, 222 42 C222 64, 190 88, 190 88 C190 88, 158 64, 158 42 C158 24, 172 10, 190 10 Z"
          fill="#4F46E5"
        />
        <Ellipse cx={190} cy={41} rx={12} ry={12} fill="#FFFFFF" />
        <Ellipse cx={190} cy={100} rx={16} ry={4.5} fill="#4F46E5" opacity={0.16} />
      </Svg>

      <View
        style={{
          position: "absolute",
          left: 10,
          top: 88,
          width: 128,
          height: 128,
          borderRadius: 64,
          backgroundColor: COLORS.electricGlow,
        }}
      />
      <LinearGradient
        colors={["#818CF8", "#4F46E5"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          position: "absolute",
          left: 26,
          top: 104,
          width: 96,
          height: 96,
          borderRadius: 48,
          alignItems: "center",
          justifyContent: "center",
          shadowColor: "#4338CA",
          shadowOffset: { width: 0, height: 10 },
          shadowOpacity: 0.3,
          shadowRadius: 16,
          elevation: 8,
        }}
      >
        <Wrench size={42} color="#FFFFFF" strokeWidth={2} />
      </LinearGradient>
    </View>
  );
}
