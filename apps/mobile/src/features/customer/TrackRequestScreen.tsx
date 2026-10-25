import React, { useEffect, useState } from "react";
import { Share, View } from "react-native";
import { Box, HStack, Text } from "@gluestack-ui/themed";
import { Share2, Star } from "lucide-react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { ProviderVerificationStatus, RequestStatus } from "@motiq/types";
import { CustomerStackParamList } from "../../navigation/types";
import { requestApi } from "../../api/requestApi";
import { providerApi } from "../../api/providerApi";
import {
  connectTrackingSocket,
  disconnectTrackingSocket,
  LocationUpdateEvent,
  onLocationUpdate,
  subscribeToRequest,
} from "../../realtime/trackingSocket";
import { GeoPoint } from "../../components/LiveTrackingMap";
import { MapBackdrop } from "../../components/MapBackdrop";
import { FloatingBackButton } from "../../components/FloatingBackButton";
import { OfflineBanner } from "../../components/OfflineBanner";
import { StatusTimeline, TimelineStep } from "../../components/StatusTimeline";
import { Badge, BottomSheet, Button, InitialsAvatar, LoadingScreen, PulseDot, StatBlock } from "../../components/ui";
import { SosButton } from "../sos/SosButton";
import { useRouteToPickup } from "../../hooks/useRouteToPickup";
import { COLORS } from "../../theme/colors";

type Props = NativeStackScreenProps<CustomerStackParamList, "TrackRequest">;

const STEPS: TimelineStep[] = [
  { key: "requested", label: "Requested" },
  { key: "matched", label: "Matched" },
  { key: "enroute", label: "On the way" },
  { key: "arrived", label: "Arrived" },
  { key: "done", label: "Completed" },
];

const STEP_INDEX: Partial<Record<RequestStatus, number>> = {
  [RequestStatus.REQUESTED]: 0,
  [RequestStatus.MATCHING]: 0,
  [RequestStatus.ASSIGNED]: 1,
  [RequestStatus.PROVIDER_ACCEPTED]: 1,
  [RequestStatus.PROVIDER_EN_ROUTE]: 2,
  [RequestStatus.ARRIVED]: 3,
  [RequestStatus.SERVICE_IN_PROGRESS]: 3,
  [RequestStatus.COMPLETED]: 4,
};

const SHEET_SNAPS = [330, 460];

interface ProviderPublicProfile {
  businessName: string;
  ratingAverage: string;
  verificationStatus: ProviderVerificationStatus;
}

/**
 * Ch54/Ch77 — subscribes to the request's room and renders it on a real map
 * (previously raw lat/lng text, the single biggest mobile UX gap flagged in
 * docs/roadmap.md). ETA is always rendered as the range the server sends,
 * never a bare number (Ch1's "never false precision," the same rule Phase
 * 3's eta.util.ts implements server-side).
 */
export function TrackRequestScreen({ route }: Props) {
  const { serviceRequestId } = route.params;
  const [status, setStatus] = useState<RequestStatus | null>(null);
  const [pickup, setPickup] = useState<GeoPoint | null>(null);
  const [location, setLocation] = useState<LocationUpdateEvent | null>(null);
  const [provider, setProvider] = useState<ProviderPublicProfile | null>(null);
  const movingPoint = location ? { latitude: location.latitude, longitude: location.longitude } : null;
  const drivingRoute = useRouteToPickup(serviceRequestId, movingPoint);

  useEffect(() => {
    let cancelled = false;

    requestApi
      .getById(serviceRequestId)
      .then((response) => {
        if (cancelled) {
          return;
        }
        const body = response.data as { status: RequestStatus; pickupLocation: GeoPoint | null };
        setStatus(body.status);
        setPickup(body.pickupLocation);
      })
      .catch(() => undefined);

    connectTrackingSocket();
    subscribeToRequest(serviceRequestId);
    const unsubscribe = onLocationUpdate((event) => setLocation(event));

    return () => {
      cancelled = true;
      unsubscribe();
      disconnectTrackingSocket();
    };
  }, [serviceRequestId]);

  useEffect(() => {
    if (!location) {
      return;
    }
    providerApi
      .getPublicProfile(location.providerProfileId)
      .then((response) => setProvider(response.data as ProviderPublicProfile))
      .catch(() => undefined);
  }, [location?.providerProfileId]);

  if (!pickup) {
    return <LoadingScreen />;
  }

  const stepIndex = status ? STEP_INDEX[status] ?? 4 : 0;
  // The real-route ETA (RoutingService) is preferred when available — it's
  // built from an actual road-path duration, narrower/more honest than the
  // straight-line one the WebSocket gateway pushes on every ping.
  const eta = drivingRoute?.eta ?? location?.eta ?? null;
  const etaText = eta ? `${eta.minMinutes}–${eta.maxMinutes} min` : null;

  function shareTripStatus() {
    const who = provider?.businessName ?? "a MOTIQ provider";
    const message = `I'm getting roadside help from ${who}${etaText ? ` — arriving in ${etaText}` : ""}. (MOTIQ)`;
    void Share.share({ message }).catch(() => undefined);
  }

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <MapBackdrop
        position={pickup}
        moving={movingPoint}
        movingLabel={provider?.businessName}
        routeGeometry={drivingRoute?.geometry}
        bottomInset={SHEET_SNAPS[0] + 16}
      >
        <View pointerEvents="box-none" style={{ gap: 10 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <FloatingBackButton />
            <SosButton serviceRequestId={serviceRequestId} />
          </View>
          <OfflineBanner />
        </View>
      </MapBackdrop>

      <BottomSheet snapPoints={SHEET_SNAPS}>
        <View style={{ gap: 16 }}>
          <HStack alignItems="flex-end" justifyContent="space-between">
            {etaText ? (
              <StatBlock label="Arriving in" value={etaText} />
            ) : (
              <HStack alignItems="center" space="sm" flex={1}>
                <PulseDot color={COLORS.warning} />
                <Text color={COLORS.textSecondary} flex={1}>
                  Waiting for your provider's live location…
                </Text>
              </HStack>
            )}
            {location ? <Badge label="Live" tone="success" /> : null}
          </HStack>

          {location ? (
            <HStack alignItems="center" space="md" bg={COLORS.surfaceRaised} borderRadius={16} p="$3">
              <InitialsAvatar name={provider?.businessName?.charAt(0)?.toUpperCase() ?? "?"} />
              <Box flex={1}>
                <Text fontWeight="$bold" size="md" color={COLORS.text}>
                  {provider?.businessName ?? "Your provider"}
                </Text>
                {provider ? (
                  <HStack alignItems="center" space="xs">
                    <Star size={12} color={COLORS.warning} fill={COLORS.warning} />
                    <Text size="sm" color={COLORS.textSecondary} textTransform="capitalize">
                      {Number(provider.ratingAverage).toFixed(1)} · {provider.verificationStatus.replace("_", " ").toLowerCase()}
                    </Text>
                  </HStack>
                ) : null}
              </Box>
            </HStack>
          ) : null}

          <StatusTimeline steps={STEPS} currentIndex={stepIndex} />

          <Button label="Share trip status" variant="outline" icon={Share2} onPress={shareTripStatus} />
        </View>
      </BottomSheet>
    </View>
  );
}
