import React from "react";
import { Text, View } from "react-native";
import { WifiOff } from "lucide-react-native";
import { useConnectivityStore } from "../store/connectivityStore";
import { COLORS, FONTS } from "../theme/colors";

/** Slim warning bar shown only while the device is offline. */
export function OfflineBanner() {
  const isConnected = useConnectivityStore((state) => state.isConnected);
  if (isConnected) return null;
  return (
    <View
      accessibilityRole="alert"
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        backgroundColor: "rgba(255, 184, 77, 0.16)",
        borderWidth: 1,
        borderColor: "rgba(255, 184, 77, 0.4)",
        borderRadius: 14,
        paddingHorizontal: 12,
        paddingVertical: 8,
      }}
    >
      <WifiOff size={16} color={COLORS.warning} />
      <Text style={{ flex: 1, fontFamily: FONTS.body, fontSize: 12.5, color: COLORS.warning }}>
        You're offline — requests are saved and sent when you reconnect
      </Text>
    </View>
  );
}
