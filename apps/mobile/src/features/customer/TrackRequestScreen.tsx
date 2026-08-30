import React, { useEffect, useState } from "react";
import { Box, HStack, Pressable, Text } from "@gluestack-ui/themed";
import { SafeAreaView } from "react-native-safe-area-context";
import { ChevronLeft, Star } from "lucide-react-native";
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
import { LiveTrackingMap, GeoPoint } from "../../components/LiveTrackingMap";
import { StatusTimeline, TimelineStep } from "../../components/StatusTimeline";
import { Card, InitialsAvatar, LoadingScreen } from "../../components/ui";
import { SosButton } from "../sos/SosButton";
import { useRouteToPickup } from "../../hooks/useRouteToPickup";

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
export function TrackRequestScreen({ route, navigation }: Props) {
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

  return (
    <Box flex={1} bg="$backgroundLight50">
      <LiveTrackingMap
        pickup={pickup}
        moving={movingPoint}
        movingLabel={provider?.businessName}
        routeGeometry={drivingRoute?.geometry}
        bottomInset={location ? 180 : 16}
      />

      <SafeAreaView style={{ position: "absolute", top: 0, left: 0, right: 0 }} edges={["top"]}>
        <Card m="$3">
          <HStack alignItems="center" justifyContent="space-between" mb="$3">
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Back"
              onPress={() => navigation.goBack()}
              w={32}
              h={32}
              borderRadius="$full"
              bg="$backgroundLight100"
              alignItems="center"
              justifyContent="center"
            >
              <ChevronLeft size={20} color="#0F172A" />
            </Pressable>
            <Text flex={1} textAlign="center" fontWeight="$extrabold" size="md" textTransform="capitalize" color="$textLight900">
              {(status ?? "Loading…").replace(/_/g, " ")}
            </Text>
            <SosButton serviceRequestId={serviceRequestId} />
          </HStack>
          <StatusTimeline steps={STEPS} currentIndex={stepIndex} />
        </Card>
      </SafeAreaView>

      {location ? (
        <SafeAreaView style={{ position: "absolute", bottom: 0, left: 0, right: 0 }} edges={["bottom"]}>
          <Card m="$3">
            <HStack alignItems="center" space="md">
              <InitialsAvatar name={provider?.businessName?.charAt(0)?.toUpperCase() ?? "?"} />
              <Box flex={1}>
                <Text fontWeight="$bold" size="md" color="$textLight900">
                  {provider?.businessName ?? "Your provider"}
                </Text>
                {provider ? (
                  <HStack alignItems="center" space="xs">
                    <Star size={12} color="#D97706" fill="#D97706" />
                    <Text size="sm" color="$textLight500" textTransform="capitalize">
                      {Number(provider.ratingAverage).toFixed(1)} · {provider.verificationStatus.replace("_", " ")}
                    </Text>
                  </HStack>
                ) : null}
              </Box>
              {eta ? (
                <Box bg="$primary50" borderRadius="$full" px="$3" py="$2">
                  <Text color="$primary700" fontWeight="$extrabold" size="sm">
                    {eta.minMinutes}-{eta.maxMinutes} min
                  </Text>
                </Box>
              ) : null}
            </HStack>
          </Card>
        </SafeAreaView>
      ) : (
        <SafeAreaView style={{ position: "absolute", bottom: 0, left: 0, right: 0 }} edges={["bottom"]}>
          <Card m="$3">
            <Text color="$textLight500" textAlign="center">
              Waiting for your provider's live location…
            </Text>
          </Card>
        </SafeAreaView>
      )}
    </Box>
  );
}
