import React, { useEffect, useState } from "react";
import { Heading, HStack, ScrollView, Text, VStack } from "@gluestack-ui/themed";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Car, Navigation, Receipt, Star } from "lucide-react-native";
import { IssueType, RequestStatus } from "@motiq/types";
import { CustomerStackParamList } from "../../navigation/types";
import { requestApi } from "../../api/requestApi";
import { A11Y_LABELS } from "../../accessibility/a11y";
import { Badge, Button, Card, LoadingScreen } from "../../components/ui";
import { statusBadgeTone } from "./statusBadgeTone";
import { ISSUE_ICONS } from "../../theme/issueIcons";

type Props = NativeStackScreenProps<CustomerStackParamList, "RequestDetail">;

interface RequestDetail {
  id: string;
  issueType: IssueType;
  status: RequestStatus;
  description: string | null;
  vehicleSnapshotMake: string;
  vehicleSnapshotModel: string;
  vehicleSnapshotPlateNumber: string;
  createdAt: string;
}

interface PaymentDetail {
  totalAmount: string;
  commissionAmount: string;
  providerPayoutAmount: string;
  status: string;
}

const LIVE_STATUSES = new Set<RequestStatus>([
  RequestStatus.REQUESTED,
  RequestStatus.MATCHING,
  RequestStatus.ASSIGNED,
  RequestStatus.PROVIDER_ACCEPTED,
  RequestStatus.PROVIDER_EN_ROUTE,
  RequestStatus.ARRIVED,
  RequestStatus.SERVICE_IN_PROGRESS,
]);

/** Ch71's mobile Customer app request-detail screen — reached from History,
 * shows the full snapshot plus a payment receipt once one exists (Ch57). */
export function RequestDetailScreen({ route, navigation }: Props) {
  const { serviceRequestId } = route.params;
  const [request, setRequest] = useState<RequestDetail | null>(null);
  const [payment, setPayment] = useState<PaymentDetail | null>(null);

  useEffect(() => {
    requestApi
      .getById(serviceRequestId)
      .then((response) => setRequest(response.data as RequestDetail))
      .catch(() => undefined);
    requestApi
      .getPayment(serviceRequestId)
      .then((response) => setPayment(response.data as PaymentDetail | null))
      .catch(() => undefined);
  }, [serviceRequestId]);

  if (!request) {
    return <LoadingScreen />;
  }

  const IssueIcon = ISSUE_ICONS[request.issueType];

  return (
    <ScrollView flex={1} bg="$backgroundLight0" contentContainerStyle={{ padding: 24 }}>
      <VStack space="md">
        <HStack alignItems="center" space="sm">
          <IssueIcon size={22} color="#4F46E5" />
          <Heading size="xl" textTransform="capitalize">
            {request.issueType.replace("_", " ")}
          </Heading>
        </HStack>
        <HStack alignItems="center" space="sm">
          <Badge label={request.status.replace(/_/g, " ")} tone={statusBadgeTone(request.status)} />
          <Text size="sm" color="$textLight500">
            {new Date(request.createdAt).toLocaleString()}
          </Text>
        </HStack>

        <Card>
          <HStack alignItems="center" space="xs" mb="$2">
            <Car size={16} color="#64748B" />
            <Text fontWeight="$bold">Vehicle</Text>
          </HStack>
          <Text>
            {request.vehicleSnapshotMake} {request.vehicleSnapshotModel} · {request.vehicleSnapshotPlateNumber}
          </Text>
        </Card>

        {request.description ? (
          <Card>
            <Text fontWeight="$bold" mb="$2">
              Description
            </Text>
            <Text>{request.description}</Text>
          </Card>
        ) : null}

        {payment ? (
          <Card>
            <HStack alignItems="center" space="xs" mb="$2">
              <Receipt size={16} color="#64748B" />
              <Text fontWeight="$bold">Receipt</Text>
            </HStack>
            <Heading size="xl">₹{payment.totalAmount}</Heading>
            <Text size="sm" color="$textLight500">
              Payment status: {payment.status}
            </Text>
          </Card>
        ) : null}

        {LIVE_STATUSES.has(request.status) ? (
          <Button
            label="Track live"
            icon={Navigation}
            onPress={() => navigation.navigate("TrackRequest", { serviceRequestId })}
          />
        ) : null}

        {request.status === RequestStatus.COMPLETED ? (
          <Button
            label="Rate this provider"
            variant="outline"
            icon={Star}
            accessibilityLabel={A11Y_LABELS.submitRatingButton}
            onPress={() => navigation.navigate("RateProvider", { serviceRequestId })}
          />
        ) : null}
      </VStack>
    </ScrollView>
  );
}
