import React, { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { ProviderStackParamList } from "../../navigation/types";
import { providerApi } from "../../api/providerApi";
import { MIN_TOUCH_TARGET_SIZE, A11Y_LABELS } from "../../accessibility/a11y";

type Props = NativeStackScreenProps<ProviderStackParamList, "JobOffer">;

/**
 * Reached only via a tapped push notification's assignmentId/serviceRequestId
 * payload (see App.tsx's addNotificationTapListener wiring) — there is no
 * REST endpoint yet for a provider to poll "what's my current pending
 * offer" (docs/roadmap.md's Reconciliation Notes), so a missed/denied push
 * notification means a missed offer with no in-app recovery path. Flagged,
 * not silently worked around.
 */
export function JobOfferScreen({ route, navigation }: Props) {
  const { assignmentId, serviceRequestId } = route.params;
  const [submitting, setSubmitting] = useState(false);

  async function handleAccept() {
    setSubmitting(true);
    try {
      await providerApi.acceptOffer(assignmentId);
      navigation.replace("ActiveJob", { assignmentId, serviceRequestId });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleReject() {
    setSubmitting(true);
    try {
      await providerApi.rejectOffer(assignmentId);
      navigation.replace("GoOnline");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>New job offer</Text>
      <Text style={styles.hint}>Accept quickly — offers expire after a timeout window.</Text>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={A11Y_LABELS.acceptOfferButton}
        style={styles.acceptButton}
        disabled={submitting}
        onPress={handleAccept}
      >
        <Text style={styles.buttonText}>Accept</Text>
      </Pressable>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={A11Y_LABELS.rejectOfferButton}
        style={styles.rejectButton}
        disabled={submitting}
        onPress={handleReject}
      >
        <Text style={styles.buttonText}>Decline</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, gap: 12, justifyContent: "center" },
  title: { fontSize: 24, fontWeight: "700", textAlign: "center" },
  hint: { textAlign: "center", color: "#64748b", marginBottom: 24 },
  acceptButton: {
    minHeight: MIN_TOUCH_TARGET_SIZE,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#16a34a",
    borderRadius: 8,
  },
  rejectButton: {
    minHeight: MIN_TOUCH_TARGET_SIZE,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#64748b",
    borderRadius: 8,
    marginTop: 8,
  },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "700" },
});
