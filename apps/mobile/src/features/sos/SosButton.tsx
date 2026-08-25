import React, { useState } from "react";
import { Alert } from "react-native";
import { HStack, Pressable, Spinner, Text } from "@gluestack-ui/themed";
import { Siren } from "lucide-react-native";
import * as Location from "expo-location";
import { sosApi } from "../../api/sosApi";
import { MIN_TOUCH_TARGET_SIZE } from "../../accessibility/a11y";

/**
 * Ch55's highest-priority path, surfaced as a persistent, always-reachable
 * button — never buried behind navigation. A single confirmation tap is the
 * only friction (prevents pure fat-finger triggers) — no multi-step flow,
 * no location-permission blocking: if location isn't available in time,
 * the alert still fires without it (Ch55's binding "never delay a genuine
 * trigger" extends to permission prompts, not just rate limits).
 */
export function SosButton({ serviceRequestId }: { serviceRequestId?: string }) {
  const [isSending, setIsSending] = useState(false);

  async function handlePress() {
    Alert.alert("Send SOS alert?", "This immediately notifies MOTIQ's safety team.", [
      { text: "Cancel", style: "cancel" },
      { text: "Yes, send SOS", style: "destructive", onPress: sendAlert },
    ]);
  }

  async function sendAlert() {
    setIsSending(true);
    let latitude: number | undefined;
    let longitude: number | undefined;
    try {
      const { status } = await Location.getForegroundPermissionsAsync();
      if (status === "granted") {
        const position = await Location.getCurrentPositionAsync({});
        latitude = position.coords.latitude;
        longitude = position.coords.longitude;
      }
    } catch {
      // No location — the alert still fires below, just without one.
    }

    try {
      const response = await sosApi.trigger({ latitude, longitude, serviceRequestId });
      Alert.alert("Alert sent", response.data.message);
    } catch {
      Alert.alert(
        "Couldn't reach MOTIQ",
        "If you are in immediate danger, contact local emergency services right now (e.g. dial 112 in India).",
      );
    } finally {
      setIsSending(false);
    }
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Send SOS emergency alert"
      onPress={handlePress}
      disabled={isSending}
      minWidth={MIN_TOUCH_TARGET_SIZE}
      minHeight={MIN_TOUCH_TARGET_SIZE}
      borderRadius={MIN_TOUCH_TARGET_SIZE / 2}
      bg="$error700"
      alignItems="center"
      justifyContent="center"
      px="$4"
    >
      {isSending ? (
        <Spinner color="$white" />
      ) : (
        <HStack alignItems="center" space="xs">
          <Siren size={14} color="#FFFFFF" />
          <Text color="$white" fontWeight="$extrabold" size="sm" letterSpacing={0.5}>
            SOS
          </Text>
        </HStack>
      )}
    </Pressable>
  );
}
