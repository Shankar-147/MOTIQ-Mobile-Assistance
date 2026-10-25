import React, { useEffect, useState } from "react";
import { Alert, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { Center, Heading, Text, VStack } from "@gluestack-ui/themed";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { MapPinOff, XCircle } from "lucide-react-native";
import { RequestStatus } from "@motiq/types";
import { CustomerStackParamList } from "../../navigation/types";
import { requestApi } from "../../api/requestApi";
import {
  connectTrackingSocket,
  disconnectTrackingSocket,
  onMatchingFailed,
  onRequestMatched,
  subscribeToRequest,
} from "../../realtime/trackingSocket";
import { A11Y_LABELS } from "../../accessibility/a11y";
import { BottomSheet, Button, StepIndicator } from "../../components/ui";
import { MapBackdrop } from "../../components/MapBackdrop";
import { FloatingBackButton } from "../../components/FloatingBackButton";
import { OfflineBanner } from "../../components/OfflineBanner";
import type { GeoPoint } from "../../components/LiveTrackingMap";
import { SosButton } from "../sos/SosButton";
import { COLORS } from "../../theme/colors";

type Props = NativeStackScreenProps<CustomerStackParamList, "Matching">;

const PRE_MATCH_STATUSES = new Set<RequestStatus>([RequestStatus.REQUESTED, RequestStatus.MATCHING]);
const NO_MATCH_STATUSES = new Set<RequestStatus>([
  RequestStatus.EXPIRED,
  RequestStatus.FAILED,
  RequestStatus.CANCELLED_BY_CUSTOMER,
  RequestStatus.CANCELLED_BY_PROVIDER,
]);

type ScreenState = "waiting" | "no-match";

const SHEET_SNAPS = [270];
const RING_SIZE = 220;

function RadarRing({ delay }: { delay: number }) {
  const reduceMotion = useReducedMotion();
  const progress = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion) return;
    progress.value = withDelay(delay, withRepeat(withTiming(1, { duration: 2400 }), -1, false));
  }, [delay, reduceMotion, progress]);

  const style = useAnimatedStyle(() => ({
    opacity: reduceMotion ? 0.35 : 0.6 * (1 - progress.value),
    transform: [{ scale: reduceMotion ? 0.7 + delay / 4000 : 0.2 + progress.value * 0.8 }],
  }));

  return (
    <Animated.View
      style={[
        {
          position: "absolute",
          width: RING_SIZE,
          height: RING_SIZE,
          borderRadius: RING_SIZE / 2,
          borderWidth: 2,
          borderColor: COLORS.accent,
          backgroundColor: COLORS.accentTint,
        },
        style,
      ]}
    />
  );
}

/**
 * Ch53/Ch71 — the real-time "finding you a provider" step between submitting
 * a request and live tracking. Pushed to via TrackingGateway's bridge of
 * MatchingService's ProviderAssigned/MatchingFailed domain events onto this
 * request's Socket.IO room (see trackingSocket.ts). Dispatch can resolve in
 * milliseconds, before the socket even connects, so this always does a
 * one-time REST read first — the same race-safe pattern TrackRequestScreen
 * already uses — before falling back to waiting on the socket.
 */
export function MatchingScreen({ route, navigation }: Props) {
  const { serviceRequestId } = route.params;
  const [state, setState] = useState<ScreenState>("waiting");
  const [cancelling, setCancelling] = useState(false);
  const [pickup, setPickup] = useState<GeoPoint | null>(null);

  useEffect(() => {
    let cancelled = false;

    requestApi
      .getById(serviceRequestId)
      .then((response) => {
        if (cancelled) {
          return;
        }
        const body = response.data as { status: RequestStatus; pickupLocation: GeoPoint | null };
        setPickup(body.pickupLocation);
        const status = body.status;
        if (NO_MATCH_STATUSES.has(status)) {
          setState("no-match");
        } else if (!PRE_MATCH_STATUSES.has(status)) {
          // Already assigned (or further along) by the time this screen
          // mounted — no need to wait on a socket event that already fired.
          navigation.replace("TrackRequest", { serviceRequestId });
        }
      })
      .catch(() => undefined); // best-effort snapshot — the socket below still covers the live case

    connectTrackingSocket();
    subscribeToRequest(serviceRequestId);
    const unsubscribeMatched = onRequestMatched(() => {
      if (!cancelled) {
        navigation.replace("TrackRequest", { serviceRequestId });
      }
    });
    const unsubscribeFailed = onMatchingFailed(() => {
      if (!cancelled) {
        setState("no-match");
      }
    });

    return () => {
      cancelled = true;
      unsubscribeMatched();
      unsubscribeFailed();
      disconnectTrackingSocket();
    };
  }, [serviceRequestId, navigation]);

  async function handleCancel() {
    setCancelling(true);
    try {
      await requestApi.cancel(serviceRequestId);
    } catch {
      // Best-effort — either it cancelled and this errored spuriously, or
      // it's already past cancellable; either way, leaving this screen is right.
    } finally {
      navigation.navigate("MainTabs");
    }
  }

  function confirmCancel() {
    Alert.alert("Cancel this request?", "We'll stop looking for a provider.", [
      { text: "Keep waiting", style: "cancel" },
      { text: "Cancel request", style: "destructive", onPress: handleCancel },
    ]);
  }

  if (state === "no-match") {
    return (
      <Center flex={1} bg={COLORS.bg} p="$8">
        <VStack alignItems="center" space="md" w="$full">
          <Center w={72} h={72} borderRadius="$full" bg="rgba(255, 77, 77, 0.16)">
            <MapPinOff size={32} color={COLORS.danger} />
          </Center>
          <Heading size="xl" textAlign="center" color={COLORS.text}>
            No provider available right now
          </Heading>
          <Text color={COLORS.textSecondary} textAlign="center">
            Nobody nearby could take this request. Try submitting again in a little while.
          </Text>
          <Button label="Try again" onPress={() => navigation.replace("CreateRequest", undefined)} />
        </VStack>
      </Center>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <MapBackdrop position={pickup} bottomInset={SHEET_SNAPS[0] + 16}>
        <View pointerEvents="box-none" style={{ gap: 10 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <FloatingBackButton icon="close" onPress={confirmCancel} />
            <SosButton serviceRequestId={serviceRequestId} />
          </View>
          <OfflineBanner />
        </View>
      </MapBackdrop>

      <View
        pointerEvents="none"
        accessibilityElementsHidden
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: SHEET_SNAPS[0],
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <RadarRing delay={0} />
        <RadarRing delay={800} />
        <RadarRing delay={1600} />
        <View
          style={{
            width: 16,
            height: 16,
            borderRadius: 8,
            backgroundColor: COLORS.accent,
            borderWidth: 3,
            borderColor: COLORS.bg,
          }}
        />
      </View>

      <BottomSheet snapPoints={SHEET_SNAPS}>
        <VStack space="md">
          <StepIndicator total={3} current={1} />
          <VStack space="xs">
            <Heading size="xl" color={COLORS.text}>
              Finding the nearest provider…
            </Heading>
            <Text color={COLORS.textSecondary}>This usually takes less than a minute.</Text>
          </VStack>
          <Button
            label={cancelling ? "Cancelling…" : "Cancel request"}
            variant="outline"
            icon={XCircle}
            accessibilityLabel={A11Y_LABELS.cancelRequestButton}
            disabled={cancelling}
            loading={cancelling}
            onPress={handleCancel}
          />
        </VStack>
      </BottomSheet>
    </View>
  );
}
