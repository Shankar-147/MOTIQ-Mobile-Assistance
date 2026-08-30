import React, { useEffect, useState } from "react";
import { Center, Heading, Spinner, Text, VStack } from "@gluestack-ui/themed";
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
import { Button } from "../../components/ui";

type Props = NativeStackScreenProps<CustomerStackParamList, "Matching">;

const PRE_MATCH_STATUSES = new Set<RequestStatus>([RequestStatus.REQUESTED, RequestStatus.MATCHING]);
const NO_MATCH_STATUSES = new Set<RequestStatus>([
  RequestStatus.EXPIRED,
  RequestStatus.FAILED,
  RequestStatus.CANCELLED_BY_CUSTOMER,
  RequestStatus.CANCELLED_BY_PROVIDER,
]);

type ScreenState = "waiting" | "no-match";

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

  useEffect(() => {
    let cancelled = false;

    requestApi
      .getById(serviceRequestId)
      .then((response) => {
        if (cancelled) {
          return;
        }
        const status = (response.data as { status: RequestStatus }).status;
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

  if (state === "no-match") {
    return (
      <Center flex={1} bg="$backgroundLight0" p="$8">
        <VStack alignItems="center" space="md">
          <Center w={72} h={72} borderRadius="$full" bg="$error50">
            <MapPinOff size={32} color="#DC2626" />
          </Center>
          <Heading size="xl" textAlign="center">
            No provider available right now
          </Heading>
          <Text color="$textLight500" textAlign="center">
            Nobody nearby could take this request. Try submitting again in a little while.
          </Text>
          <Button label="Try again" onPress={() => navigation.replace("CreateRequest", undefined)} />
        </VStack>
      </Center>
    );
  }

  return (
    <Center flex={1} bg="$backgroundLight0" p="$8">
      <VStack alignItems="center" space="lg">
        <Spinner size="large" color="$primary600" />
        <VStack alignItems="center" space="xs">
          <Heading size="xl" textAlign="center">
            Finding you a nearby provider…
          </Heading>
          <Text color="$textLight500" textAlign="center">
            This usually takes less than a minute.
          </Text>
        </VStack>
        <Button
          label={cancelling ? "Cancelling…" : "Cancel request"}
          variant="danger"
          icon={XCircle}
          accessibilityLabel={A11Y_LABELS.cancelRequestButton}
          disabled={cancelling}
          loading={cancelling}
          onPress={handleCancel}
        />
      </VStack>
    </Center>
  );
}
