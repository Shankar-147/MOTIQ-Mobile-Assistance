import React, { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RequestStatus } from "@motiq/types";
import { ProviderStackParamList } from "../../navigation/types";
import { providerApi } from "../../api/providerApi";
import { MIN_TOUCH_TARGET_SIZE } from "../../accessibility/a11y";

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

/**
 * Ch72's job-progress flow — one button that always advances to the next
 * state in Ch19's state machine (RequestService.transition() rejects
 * anything else server-side, so the client doesn't need its own transition
 * validation, only the current-step label).
 */
export function ActiveJobScreen({ route, navigation }: Props) {
  const { assignmentId } = route.params;
  const [status, setStatus] = useState<RequestStatus>(RequestStatus.PROVIDER_ACCEPTED);
  const [submitting, setSubmitting] = useState(false);

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
        navigation.replace("GoOnline");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.statusLabel}>Current status</Text>
      <Text style={styles.statusValue}>{status}</Text>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={STEP_LABEL[status]}
        style={styles.button}
        disabled={submitting || status === RequestStatus.COMPLETED}
        onPress={handleAdvance}
      >
        <Text style={styles.buttonText}>{submitting ? "Updating…" : STEP_LABEL[status]}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, gap: 12, justifyContent: "center" },
  statusLabel: { fontSize: 14, color: "#555", textAlign: "center" },
  statusValue: { fontSize: 24, fontWeight: "700", textAlign: "center", marginBottom: 24 },
  button: {
    minHeight: MIN_TOUCH_TARGET_SIZE,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#1d4ed8",
    borderRadius: 8,
  },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "700" },
});
