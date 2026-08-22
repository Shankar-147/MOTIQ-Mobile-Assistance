import React, { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import * as Location from "expo-location";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { PresenceStatus } from "@motiq/types";
import { ProviderStackParamList } from "../../navigation/types";
import { providerApi } from "../../api/providerApi";
import { consentApi } from "../../api/consentApi";
import { connectTrackingSocket, disconnectTrackingSocket, sendPresenceHeartbeat } from "../../realtime/trackingSocket";
import { startForegroundLocationTracking, stopLocationTracking } from "./locationTracking";
import { registerForPushNotifications } from "../../notifications/pushRegistration";
import { usePendingOfferStore } from "../../store/pendingOfferStore";
import { MIN_TOUCH_TARGET_SIZE, A11Y_LABELS } from "../../accessibility/a11y";

type Props = NativeStackScreenProps<ProviderStackParamList, "GoOnline">;

const HEARTBEAT_INTERVAL_MS = 20_000;

/**
 * Ch72's presence toggle — the provider-side entry point that mirrors the
 * server's PresenceStatus state machine (Ch76). Going online starts the
 * tracking socket, foreground location updates, and the heartbeat; going
 * offline tears all three down, matching the server's own 30s grace-period
 * expectation (presence-grace.util.ts) rather than leaving a stale
 * "still connected" socket around.
 */
export function GoOnlineScreen({ navigation }: Props) {
  const [online, setOnline] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pendingOffer = usePendingOfferStore((state) => state.pendingOffer);
  const setPendingOffer = usePendingOfferStore((state) => state.setPendingOffer);

  useEffect(() => {
    registerForPushNotifications().catch(() => undefined);
  }, []);

  useEffect(() => {
    if (pendingOffer) {
      setPendingOffer(null);
      navigation.navigate("JobOffer", pendingOffer);
    }
  }, [pendingOffer, setPendingOffer, navigation]);

  useEffect(() => {
    if (!online) {
      return;
    }
    const heartbeat = setInterval(sendPresenceHeartbeat, HEARTBEAT_INTERVAL_MS);
    return () => clearInterval(heartbeat);
  }, [online]);

  async function handleToggle() {
    setError(null);
    if (online) {
      stopLocationTracking();
      disconnectTrackingSocket();
      await providerApi.updatePresence(PresenceStatus.OFFLINE);
      setOnline(false);
      return;
    }

    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") {
      setError("Location permission is required to go online.");
      return;
    }
    const position = await Location.getCurrentPositionAsync({});
    // Ch128 — must precede any presence update carrying a location, which
    // the backend now gates on this consent existing (ConsentService).
    await consentApi.grantLocationTracking();
    await providerApi.updatePresence(PresenceStatus.ONLINE, {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
    });
    connectTrackingSocket();
    await startForegroundLocationTracking();
    setOnline(true);
  }

  return (
    <View style={styles.container}>
      <Text style={styles.status}>{online ? "You're online" : "You're offline"}</Text>
      <Text style={styles.hint}>
        {online
          ? "You'll receive job offers as a push notification while the app is open."
          : "Go online to start receiving nearby job offers."}
      </Text>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={A11Y_LABELS.goOnlineToggle}
        style={[styles.button, online && styles.buttonOnline]}
        onPress={handleToggle}
      >
        <Text style={styles.buttonText}>{online ? "Go offline" : "Go online"}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, gap: 12, justifyContent: "center" },
  status: { fontSize: 24, fontWeight: "700", textAlign: "center" },
  hint: { textAlign: "center", color: "#64748b" },
  error: { color: "#dc2626", textAlign: "center" },
  button: {
    minHeight: MIN_TOUCH_TARGET_SIZE,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#16a34a",
    borderRadius: 8,
    marginTop: 24,
  },
  buttonOnline: { backgroundColor: "#dc2626" },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "700" },
});
