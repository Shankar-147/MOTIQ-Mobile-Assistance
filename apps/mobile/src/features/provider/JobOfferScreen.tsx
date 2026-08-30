import React, { useEffect, useState } from "react";
import { Center, HStack, Heading, Spinner, Text, VStack } from "@gluestack-ui/themed";
import { Check, PackageCheck, X } from "lucide-react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { IssueType } from "@motiq/types";
import { ProviderStackParamList } from "../../navigation/types";
import { providerApi } from "../../api/providerApi";
import { requestApi } from "../../api/requestApi";
import { ISSUE_ICONS } from "../../theme/issueIcons";
import { A11Y_LABELS } from "../../accessibility/a11y";
import { Button } from "../../components/ui";

type Props = NativeStackScreenProps<ProviderStackParamList, "JobOffer">;

interface JobOfferRequestDetails {
  issueType: IssueType;
  description: string | null;
  vehicleSnapshotMake: string;
  vehicleSnapshotModel: string;
  vehicleSnapshotPlateNumber: string;
}

/**
 * Reached only via a tapped push notification's assignmentId/serviceRequestId
 * payload (see App.tsx's addNotificationTapListener wiring) — there is no
 * REST endpoint yet for a provider to poll "what's my current pending
 * offer" (docs/roadmap.md's Reconciliation Notes), so a missed/denied push
 * notification means a missed offer with no in-app recovery path. Flagged,
 * not silently worked around.
 *
 * Fetches the request's own details (issue, vehicle, description) via
 * GET /requests/:id — RequestController.findOne() already allows PROVIDER
 * reads — instead of showing a bare "New job offer" with nothing to decide
 * on, which is what this screen did before.
 */
export function JobOfferScreen({ route, navigation }: Props) {
  const { assignmentId, serviceRequestId } = route.params;
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [details, setDetails] = useState<JobOfferRequestDetails | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    requestApi
      .getById(serviceRequestId)
      .then((response) => setDetails(response.data as JobOfferRequestDetails))
      .catch(() => setError("Couldn't load this job's details."))
      .finally(() => setLoading(false));
  }, [serviceRequestId]);

  async function handleAccept() {
    setSubmitting(true);
    setError(null);
    try {
      await providerApi.acceptOffer(assignmentId);
      navigation.replace("ActiveJob", { assignmentId, serviceRequestId });
    } catch {
      setError("This offer is no longer available to accept — it may have expired or already been resolved.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleReject() {
    setSubmitting(true);
    setError(null);
    try {
      await providerApi.rejectOffer(assignmentId);
      navigation.replace("MainTabs");
    } catch {
      setError("Couldn't decline this offer — it may have already been resolved.");
    } finally {
      setSubmitting(false);
    }
  }

  const Icon = details ? ISSUE_ICONS[details.issueType] : PackageCheck;
  const hasVehicle = details && details.vehicleSnapshotMake !== "Unspecified";

  return (
    <VStack flex={1} bg="$backgroundLight0" p="$6" justifyContent="center" space="md">
      <Center mb="$4">
        <Center w={80} h={80} borderRadius="$full" bg="$primary50" mb="$4">
          <Icon size={36} color="#4F46E5" />
        </Center>
        <Heading size="2xl" textAlign="center">
          New job offer
        </Heading>
        <Text color="$textLight500" textAlign="center" mt="$1">
          Accept quickly — offers expire after a timeout window.
        </Text>
      </Center>

      {loading ? (
        <Center py="$4">
          <Spinner />
        </Center>
      ) : details ? (
        <VStack bg="$backgroundLight50" borderRadius="$xl" p="$4" space="sm">
          <HStack justifyContent="space-between">
            <Text color="$textLight500">Concern</Text>
            <Text fontWeight="$bold">{details.issueType.replace(/_/g, " ")}</Text>
          </HStack>
          <HStack justifyContent="space-between">
            <Text color="$textLight500">Vehicle</Text>
            <Text fontWeight="$bold">
              {hasVehicle ? `${details.vehicleSnapshotMake} ${details.vehicleSnapshotModel}` : "Not specified"}
            </Text>
          </HStack>
          {hasVehicle && (
            <HStack justifyContent="space-between">
              <Text color="$textLight500">Plate</Text>
              <Text fontWeight="$bold">{details.vehicleSnapshotPlateNumber}</Text>
            </HStack>
          )}
          {details.description ? (
            <VStack space="xs" mt="$1">
              <Text color="$textLight500">Customer's note</Text>
              <Text>{details.description}</Text>
            </VStack>
          ) : null}
        </VStack>
      ) : null}

      {error ? (
        <Text color="$error600" textAlign="center">
          {error}
        </Text>
      ) : null}

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
