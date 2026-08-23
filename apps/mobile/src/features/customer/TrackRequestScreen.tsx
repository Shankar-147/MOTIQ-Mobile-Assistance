import React, { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RequestStatus } from "@motiq/types";
import { CustomerStackParamList } from "../../navigation/types";
import { requestApi } from "../../api/requestApi";
import {
  connectTrackingSocket,
  disconnectTrackingSocket,
  LocationUpdateEvent,
  onLocationUpdate,
  subscribeToRequest,
} from "../../realtime/trackingSocket";
import { SosButton } from "../sos/SosButton";

type Props = NativeStackScreenProps<CustomerStackParamList, "TrackRequest">;

/**
 * Ch54/Ch77 — subscribes to the request's room and renders whatever the
 * server broadcasts (ADR 0015's protocol, see docs/api-conventions.md's
 * WebSocket table). ETA is always rendered as the range the server sends,
 * never a bare number (Ch1's "never false precision," the same rule Phase
 * 3's eta.util.ts implements server-side).
 */
export function TrackRequestScreen({ route }: Props) {
  const { serviceRequestId } = route.params;
  const [status, setStatus] = useState<RequestStatus | null>(null);
  const [location, setLocation] = useState<LocationUpdateEvent | null>(null);

  useEffect(() => {
    let cancelled = false;

    requestApi
      .getById(serviceRequestId)
      .then((response) => {
        if (!cancelled) {
          setStatus((response.data as { status: RequestStatus }).status);
        }
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

  return (
    <View style={styles.container}>
      <View style={styles.topRow}>
        <View>
          <Text style={styles.statusLabel}>Status</Text>
          <Text style={styles.statusValue}>{status ?? "Loading…"}</Text>
        </View>
        <SosButton serviceRequestId={serviceRequestId} />
      </View>

      {location ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Provider location</Text>
          <Text>
            {location.latitude.toFixed(5)}, {location.longitude.toFixed(5)}
          </Text>
          {location.eta ? (
            <Text style={styles.eta}>
              Arriving in {location.eta.minMinutes}-{location.eta.maxMinutes} min
            </Text>
          ) : (
            <Text style={styles.eta}>ETA not available yet</Text>
          )}
        </View>
      ) : (
        <Text style={styles.waiting}>Waiting for your provider's live location…</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, gap: 12 },
  topRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  statusLabel: { fontSize: 14, color: "#555" },
  statusValue: { fontSize: 24, fontWeight: "700" },
  card: { borderWidth: 1, borderColor: "#cbd5e1", borderRadius: 8, padding: 16, marginTop: 16 },
  cardTitle: { fontWeight: "600", marginBottom: 8 },
  eta: { marginTop: 8, fontSize: 16, fontWeight: "600" },
  waiting: { marginTop: 24, color: "#64748b" },
});
