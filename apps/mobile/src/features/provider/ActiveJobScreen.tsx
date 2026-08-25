import React, { useEffect, useState } from "react";
import { Box, HStack, Text } from "@gluestack-ui/themed";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Location from "expo-location";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RequestStatus } from "@motiq/types";
import { ProviderStackParamList } from "../../navigation/types";
import { providerApi } from "../../api/providerApi";
import { requestApi } from "../../api/requestApi";
import { LiveTrackingMap, GeoPoint } from "../../components/LiveTrackingMap";
import { StatusTimeline, TimelineStep } from "../../components/StatusTimeline";
import { Button, Card, LoadingScreen } from "../../components/ui";
import { SosButton } from "../sos/SosButton";

type Props = NativeStackScreenProps<ProviderStackParamList, "ActiveJob">;

const NEXT_STATUS: Partial<Record<RequestStatus, RequestStatus>> = {
  [RequestStatus.PROVIDER_ACCEPTED]: RequestStatus.PROVIDER_EN_ROUTE,
  [RequestStatus.PROVIDER_EN_ROUTE]: RequestStatus.ARRIVED,
  [RequestStatus.ARRIVED]: RequestStatus.SERVICE_IN_PROGRESS,
  [RequestStatus.SERVICE_IN_PROGRESS]: RequestStatus.COMPLETED,
};

const STEP_LABEL: Record<RequestStatus, string> = {
  [RequestStatus.PROVIDER_ACCEPTED]: "Start heading to the customer",
  [RequestStatus.PROVIDER_EN_ROUTE]: "Mark as arrived",
  [RequestStatus.ARRIVED]: "Start the job",
  [RequestStatus.SERVICE_IN_PROGRESS]: "Mark job complete",
  [RequestStatus.COMPLETED]: "Job complete",
} as Record<RequestStatus, string>;

const STEPS: TimelineStep[] = [
  { key: "accepted", label: "Accepted" },
  { key: "enroute", label: "On the way" },
  { key: "arrived", label: "Arrived" },
  { key: "done", label: "Completed" },
];

const STEP_INDEX: Record<RequestStatus, number> = {
  [RequestStatus.PROVIDER_ACCEPTED]: 0,
  [RequestStatus.PROVIDER_EN_ROUTE]: 1,
  [RequestStatus.ARRIVED]: 2,
  [RequestStatus.SERVICE_IN_PROGRESS]: 2,
  [RequestStatus.COMPLETED]: 3,
} as Record<RequestStatus, number>;

/**
 * Ch72's job-progress flow — one button that always advances to the next
 * state in Ch19's state machine (RequestService.transition() rejects
 * anything else server-side, so the client doesn't need its own transition
 * validation, only the current-step label). Shown on a real map (previously
 * an abstract button-only screen with no sense of "where am I relative to
 * the customer," flagged in docs/roadmap.md) — a lightweight local location
 * watcher drives the "you are here" marker, independent of
 * locationTracking.ts's socket-emitting watcher so this screen doesn't need
 * to reach into that module's internals just to read a position back.
 */
export function ActiveJobScreen({ route, navigation }: Props) {
  const { assignmentId, serviceRequestId } = route.params;
  const [status, setStatus] = useState<RequestStatus>(RequestStatus.PROVIDER_ACCEPTED);
  const [submitting, setSubmitting] = useState(false);
  const [pickup, setPickup] = useState<GeoPoint | null>(null);
  const [ownPosition, setOwnPosition] = useState<GeoPoint | null>(null);

  useEffect(() => {
    requestApi
      .getById(serviceRequestId)
      .then((response) => {
        const body = response.data as { status: RequestStatus; pickupLocation: GeoPoint | null };
        setPickup(body.pickupLocation);
        // Previously hardcoded to PROVIDER_ACCEPTED regardless of the real
        // status — wrong if this screen is reached after the app was
        // backgrounded and reopened mid-job. Only trust it if it's still a
        // step this screen knows how to render (STEP_INDEX covers it) —
        // an already-COMPLETED request falling through here would leave
        // the button stuck disabled with a stale label otherwise.
        if (body.status in STEP_INDEX) {
          setStatus(body.status);
        }
      })
      .catch(() => undefined);
  }, [serviceRequestId]);

  useEffect(() => {
    let subscription: Location.LocationSubscription | null = null;
    let cancelled = false;

    (async () => {
      const { status: permissionStatus } = await Location.getForegroundPermissionsAsync();
      if (permissionStatus !== "granted" || cancelled) {
        return;
      }
      subscription = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.Balanced, timeInterval: 5000, distanceInterval: 25 },
        (position) => {
          setOwnPosition({ latitude: position.coords.latitude, longitude: position.coords.longitude });
        },
      );
    })();

    return () => {
      cancelled = true;
      subscription?.remove();
    };
  }, []);

  async function handleAdvance() {
    const next = NEXT_STATUS[status];
    if (!next) {
      return;
    }
    setSubmitting(true);
    try {
      await providerApi.advanceJobStatus(assignmentId, next);
      setStatus(next);
      if (next === RequestStatus.COMPLETED) {
        navigation.replace("MainTabs");
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (!pickup) {
    return <LoadingScreen />;
  }

  return (
    <Box flex={1} bg="$backgroundLight50">
      <LiveTrackingMap pickup={pickup} moving={ownPosition} movingLabel="You" bottomInset={140} />

      <SafeAreaView style={{ position: "absolute", top: 0, left: 0, right: 0 }} edges={["top"]}>
        <Card m="$3">
          <HStack alignItems="center" justifyContent="space-between" mb="$3">
            <Text flex={1} fontWeight="$extrabold" size="md" textTransform="capitalize" color="$textLight900">
              {status.replace(/_/g, " ")}
            </Text>
            <SosButton serviceRequestId={serviceRequestId} />
          </HStack>
          <StatusTimeline steps={STEPS} currentIndex={STEP_INDEX[status] ?? 0} />
        </Card>
      </SafeAreaView>

      <SafeAreaView style={{ position: "absolute", bottom: 0, left: 0, right: 0 }} edges={["bottom"]}>
        <Box m="$3">
          <Button
            label={submitting ? "Updating…" : STEP_LABEL[status]}
            accessibilityLabel={STEP_LABEL[status]}
            disabled={submitting || status === RequestStatus.COMPLETED}
            loading={submitting}
            onPress={handleAdvance}
          />
        </Box>
      </SafeAreaView>
    </Box>
  );
}
