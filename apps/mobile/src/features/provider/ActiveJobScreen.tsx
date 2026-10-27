import React, { useEffect, useRef, useState } from "react";
import { Text, View } from "react-native";
import * as Location from "expo-location";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RequestStatus } from "@motiq/types";
import { ProviderStackParamList } from "../../navigation/types";
import { providerApi } from "../../api/providerApi";
import { requestApi } from "../../api/requestApi";
import { GeoPoint } from "../../components/LiveTrackingMap";
import { MapBackdrop } from "../../components/MapBackdrop";
import { OfflineBanner } from "../../components/OfflineBanner";
import { StatusTimeline, TimelineStep } from "../../components/StatusTimeline";
import { BottomSheet, Button, LoadingScreen, SlideToConfirm } from "../../components/ui";
import { SosButton } from "../sos/SosButton";
import { useRouteToPickup } from "../../hooks/useRouteToPickup";
import { startForegroundLocationTracking, startSimulatedDrive } from "./locationTracking";
import { COLORS, FONTS } from "../../theme/colors";

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

const SHEET_SNAPS = [300];

// Presentation tool: enabled only in builds made with EXPO_PUBLIC_DEMO_TOOLS=true.
const DEMO_TOOLS = process.env.EXPO_PUBLIC_DEMO_TOOLS === "true";

/**
 * Ch72's job-progress flow — one control that always advances to the next
 * state in Ch19's state machine (RequestService.transition() rejects
 * anything else server-side, so the client doesn't need its own transition
 * validation, only the current-step label). Shown on a real map; a
 * lightweight local location watcher drives the "you are here" marker,
 * independent of locationTracking.ts's socket-emitting watcher so this screen
 * doesn't need to reach into that module's internals just to read a
 * position back. Advancing is a slide-to-confirm so a stray tap can't skip a
 * step.
 */
export function ActiveJobScreen({ route, navigation }: Props) {
  const { assignmentId, serviceRequestId } = route.params;
  const [status, setStatus] = useState<RequestStatus>(RequestStatus.PROVIDER_ACCEPTED);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pickup, setPickup] = useState<GeoPoint | null>(null);
  const [ownPosition, setOwnPosition] = useState<GeoPoint | null>(null);
  const [driving, setDriving] = useState(false);
  const stopDriveRef = useRef<(() => void) | null>(null);
  const drivingRoute = useRouteToPickup(serviceRequestId, ownPosition);

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
        // the control stuck with a stale label otherwise.
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

  useEffect(() => () => stopDriveRef.current?.(), []);

  function handleSimulateDrive() {
    if (!pickup || driving) {
      return;
    }
    setDriving(true);
    // Start roughly 1.7 km from the pickup point and drive straight to it.
    const start = { latitude: pickup.latitude + 0.012, longitude: pickup.longitude + 0.01 };
    stopDriveRef.current = startSimulatedDrive(start, pickup, setOwnPosition, () => {
      setDriving(false);
      void startForegroundLocationTracking();
    });
  }

  async function handleAdvance() {
    const next = NEXT_STATUS[status];
    if (!next || submitting) {
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await providerApi.advanceJobStatus(assignmentId, next);
      setStatus(next);
      if (next === RequestStatus.COMPLETED) {
        navigation.replace("MainTabs");
      }
    } catch {
      setError("Couldn't update the job — check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!pickup) {
    return <LoadingScreen />;
  }

  const hasNext = Boolean(NEXT_STATUS[status]);

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <MapBackdrop
        position={pickup}
        moving={ownPosition}
        movingLabel="You"
        routeGeometry={drivingRoute?.geometry}
        bottomInset={SHEET_SNAPS[0] + 16}
      >
        <View pointerEvents="box-none" style={{ gap: 10 }}>
          <View style={{ flexDirection: "row", justifyContent: "flex-end" }}>
            <SosButton serviceRequestId={serviceRequestId} />
          </View>
          <OfflineBanner />
        </View>
      </MapBackdrop>

      <BottomSheet snapPoints={SHEET_SNAPS}>
        <View style={{ gap: 16 }}>
          <Text style={{ fontFamily: FONTS.display, fontSize: 22, color: COLORS.text, textTransform: "capitalize" }}>
            {status.replace(/_/g, " ").toLowerCase()}
          </Text>
          <StatusTimeline steps={STEPS} currentIndex={STEP_INDEX[status] ?? 0} />
          {error ? (
            <Text style={{ fontFamily: FONTS.body, fontSize: 13, color: COLORS.danger }}>{error}</Text>
          ) : null}
          {DEMO_TOOLS && status === RequestStatus.PROVIDER_EN_ROUTE ? (
            <Button
              label={driving ? "Driving… live location streaming" : "Simulate the drive (demo)"}
              variant="outline"
              disabled={driving}
              onPress={handleSimulateDrive}
            />
          ) : null}
          {hasNext ? (
            <SlideToConfirm
              label={`Slide: ${STEP_LABEL[status]}`}
              loading={submitting}
              onConfirm={handleAdvance}
            />
          ) : null}
        </View>
      </BottomSheet>
    </View>
  );
}
