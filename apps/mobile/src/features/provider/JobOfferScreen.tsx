import React, { useState } from "react";
import { Center, Heading, Text, VStack } from "@gluestack-ui/themed";
import { Check, PackageCheck, X } from "lucide-react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { ProviderStackParamList } from "../../navigation/types";
import { providerApi } from "../../api/providerApi";
import { A11Y_LABELS } from "../../accessibility/a11y";
import { Button } from "../../components/ui";

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
      navigation.replace("MainTabs");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <VStack flex={1} bg="$backgroundLight0" p="$6" justifyContent="center" space="md">
      <Center mb="$4">
        <Center w={80} h={80} borderRadius="$full" bg="$primary50" mb="$4">
          <PackageCheck size={36} color="#4F46E5" />
        </Center>
        <Heading size="2xl" textAlign="center">
          New job offer
        </Heading>
        <Text color="$textLight500" textAlign="center" mt="$1">
          Accept quickly — offers expire after a timeout window.
        </Text>
      </Center>

      <Button
        label="Accept"
        variant="success"
        icon={Check}
        accessibilityLabel={A11Y_LABELS.acceptOfferButton}
        disabled={submitting}
        onPress={handleAccept}
      />
      <Button
        label="Decline"
        variant="outline"
        icon={X}
        accessibilityLabel={A11Y_LABELS.rejectOfferButton}
        disabled={submitting}
        onPress={handleReject}
      />
    </VStack>
  );
}
