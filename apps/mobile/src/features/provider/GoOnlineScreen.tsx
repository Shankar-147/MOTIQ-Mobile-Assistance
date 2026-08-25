import React, { useEffect, useState } from "react";
import { Box, Heading, HStack, Text, VStack } from "@gluestack-ui/themed";
import * as Location from "expo-location";
import { Star } from "lucide-react-native";
import type { CompositeScreenProps } from "@react-navigation/native";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { PresenceStatus, ProviderVerificationStatus } from "@motiq/types";
import { ProviderStackParamList, ProviderTabParamList } from "../../navigation/types";
import { providerApi } from "../../api/providerApi";
import { consentApi } from "../../api/consentApi";
import { connectTrackingSocket, disconnectTrackingSocket, sendPresenceHeartbeat } from "../../realtime/trackingSocket";
import { startForegroundLocationTracking, stopLocationTracking } from "./locationTracking";
import { registerForPushNotifications } from "../../notifications/pushRegistration";
import { usePendingOfferStore } from "../../store/pendingOfferStore";
import { A11Y_LABELS } from "../../accessibility/a11y";
import { Badge, Button, Card } from "../../components/ui";
import { verificationBadgeTone } from "./verificationBadgeTone";

type Props = CompositeScreenProps<
  BottomTabScreenProps<ProviderTabParamList, "Home">,
  NativeStackScreenProps<ProviderStackParamList>
>;

const HEARTBEAT_INTERVAL_MS = 20_000;

interface OwnProfileSummary {
  businessName: string;
  verificationStatus: ProviderVerificationStatus;
  ratingAverage: string;
  completedJobCount: number;
}

/**
 * Ch72's Home tab: the presence toggle that mirrors the server's
 * PresenceStatus state machine (Ch76), plus a quick stats card (tier,
 * rating, completed jobs) so a provider isn't limited to a bare on/off
 * switch. Going online starts the tracking socket, foreground location
 * updates, and the heartbeat; going offline tears all three down, matching
 * the server's own 30s grace-period expectation (presence-grace.util.ts).
 */
export function GoOnlineScreen({ navigation }: Props) {
  const [online, setOnline] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<OwnProfileSummary | null>(null);
  const pendingOffer = usePendingOfferStore((state) => state.pendingOffer);
  const setPendingOffer = usePendingOfferStore((state) => state.setPendingOffer);

  useEffect(() => {
    registerForPushNotifications().catch(() => undefined);
  }, []);

  useEffect(() => {
    providerApi
      .getOwnProfile()
      .then((response) => setProfile(response.data as OwnProfileSummary))
      .catch(() => undefined);
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
    <VStack flex={1} bg="$backgroundLight0" p="$6" justifyContent="center" space="lg">
      {profile ? (
        <Card>
          <Heading size="lg">{profile.businessName}</Heading>
          <Box mt="$1" mb="$1">
            <Badge label={profile.verificationStatus.replace("_", " ")} tone={verificationBadgeTone(profile.verificationStatus)} />
          </Box>
          <HStack space="xl" mt="$3">
            <VStack alignItems="center">
              <HStack alignItems="center" space="xs">
                <Star size={16} color="#D97706" fill="#D97706" />
                <Text fontWeight="$extrabold" size="xl">
                  {Number(profile.ratingAverage).toFixed(1)}
                </Text>
              </HStack>
              <Text size="xs" color="$textLight500">
                Rating
              </Text>
            </VStack>
            <VStack alignItems="center">
              <Text fontWeight="$extrabold" size="xl">
                {profile.completedJobCount}
              </Text>
              <Text size="xs" color="$textLight500">
                Jobs done
              </Text>
            </VStack>
          </HStack>
        </Card>
      ) : null}

      <VStack space="xs" alignItems="center">
        <Heading size="2xl" textAlign="center">
          {online ? "You're online" : "You're offline"}
        </Heading>
        <Text color="$textLight500" textAlign="center">
          {online
            ? "You'll receive job offers as a push notification while the app is open."
            : "Go online to start receiving nearby job offers."}
        </Text>
        {error ? (
          <Text color="$error600" textAlign="center">
            {error}
          </Text>
        ) : null}
      </VStack>

      <Button
        label={online ? "Go offline" : "Go online"}
        variant={online ? "danger" : "success"}
        accessibilityLabel={A11Y_LABELS.goOnlineToggle}
        onPress={handleToggle}
      />
    </VStack>
  );
}
