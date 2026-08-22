import React, { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import * as Location from "expo-location";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { IssueType } from "@motiq/types";
import { CustomerStackParamList } from "../../navigation/types";
import { requestApi } from "../../api/requestApi";
import { consentApi } from "../../api/consentApi";
import { enqueueServiceRequest } from "../../api/offlineQueue";
import { useConnectivityStore } from "../../store/connectivityStore";
import { MIN_TOUCH_TARGET_SIZE, A11Y_LABELS } from "../../accessibility/a11y";

type Props = NativeStackScreenProps<CustomerStackParamList, "CreateRequest">;

const ISSUE_TYPES = Object.values(IssueType);

export function CreateRequestScreen({ navigation }: Props) {
  // No public "list Service Areas" endpoint exists yet for an authenticated
  // customer to pick from (see docs/roadmap.md's Reconciliation Notes) — a
  // free-text ID is this phase's honest stand-in for a real picker.
  const [serviceAreaId, setServiceAreaId] = useState("");
  const [issueType, setIssueType] = useState<IssueType>(IssueType.OTHER);
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const isConnected = useConnectivityStore((state) => state.isConnected);

  async function handleSubmit() {
    setStatus(null);
    setSubmitting(true);
    try {
      const { status: permissionStatus } = await Location.requestForegroundPermissionsAsync();
      if (permissionStatus !== "granted") {
        setStatus("Location permission is required to request assistance.");
        return;
      }
      const position = await Location.getCurrentPositionAsync({});
      const dto = {
        serviceAreaId,
        issueType,
        pickupLocation: {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        },
        description: description || undefined,
      };

      if (!isConnected) {
        // Ch67's mandatory offline-first guarantee — queue locally and let
        // watchConnectivityAndFlush (wired in App.tsx) submit it on reconnect.
        // Consent (Ch128) is granted on reconnect too, right before the
        // queue flushes — see offlineQueue.ts.
        await enqueueServiceRequest(dto);
        setStatus("You're offline — your request is saved and will send automatically once you reconnect.");
        return;
      }

      // Ch128 — must precede requestApi.create(), which the backend now
      // gates on this consent existing (ConsentService.requireConsent()).
      await consentApi.grantLocationTracking();
      const response = await requestApi.create(dto);
      const created = response.data as { id: string };
      navigation.navigate("TrackRequest", { serviceRequestId: created.id });
    } catch {
      // A live-but-failing request (server error, not offline) still queues
      // locally rather than losing the attempt.
      await enqueueServiceRequest({
        serviceAreaId,
        issueType,
        pickupLocation: { latitude: 0, longitude: 0 },
        description: description || undefined,
      });
      setStatus("Couldn't reach MOTIQ right now — your request is saved and will retry automatically.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View style={styles.container}>
      {!isConnected ? <Text style={styles.offlineBanner}>You're offline</Text> : null}

      <Text style={styles.label}>What's wrong?</Text>
      <View style={styles.issueRow}>
        {ISSUE_TYPES.map((type) => (
          <Pressable
            key={type}
            accessibilityRole="button"
            accessibilityLabel={`Issue type: ${type}`}
            style={[styles.issueChip, issueType === type && styles.issueChipSelected]}
            onPress={() => setIssueType(type)}
          >
            <Text style={issueType === type ? styles.issueChipTextSelected : styles.issueChipText}>
              {type.replace("_", " ")}
            </Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.label}>Service Area ID</Text>
      <TextInput
        style={styles.input}
        placeholder="Ask support for your city's Service Area ID"
        value={serviceAreaId}
        onChangeText={setServiceAreaId}
        accessibilityLabel="Service area ID"
      />

      <Text style={styles.label}>Description (optional)</Text>
      <TextInput
        style={[styles.input, styles.multiline]}
        placeholder="Anything the provider should know"
        value={description}
        onChangeText={setDescription}
        multiline
        accessibilityLabel="Description"
      />

      {status ? <Text style={styles.status}>{status}</Text> : null}

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={A11Y_LABELS.createRequestButton}
        style={styles.button}
        disabled={submitting || !serviceAreaId}
        onPress={handleSubmit}
      >
        <Text style={styles.buttonText}>{submitting ? "Requesting…" : "Request assistance"}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, gap: 12 },
  offlineBanner: {
    backgroundColor: "#fef3c7",
    color: "#92400e",
    padding: 8,
    borderRadius: 6,
    textAlign: "center",
    fontWeight: "600",
  },
  label: { fontSize: 14, color: "#555", marginTop: 8 },
  issueRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  issueChip: {
    minHeight: MIN_TOUCH_TARGET_SIZE,
    paddingHorizontal: 14,
    justifyContent: "center",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#cbd5e1",
  },
  issueChipSelected: { backgroundColor: "#1d4ed8", borderColor: "#1d4ed8" },
  issueChipText: { color: "#334155" },
  issueChipTextSelected: { color: "#fff", fontWeight: "600" },
  input: {
    minHeight: MIN_TOUCH_TARGET_SIZE,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 16,
  },
  multiline: { minHeight: 80, textAlignVertical: "top", paddingVertical: 12 },
  status: { color: "#334155" },
  button: {
    minHeight: MIN_TOUCH_TARGET_SIZE,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#dc2626",
    borderRadius: 8,
    marginTop: 12,
  },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "700" },
});
