import React, { useCallback, useState } from "react";
import { Center, Heading, HStack, ScrollView, Text, VStack } from "@gluestack-ui/themed";
import { useFocusEffect } from "@react-navigation/native";
import { IndianRupee } from "lucide-react-native";
import { PaymentStatus } from "@motiq/types";
import { Badge, BadgeTone, Card, LoadingScreen } from "../../components/ui";
import { providerApi } from "../../api/providerApi";

interface RecentPayment {
  id: string;
  serviceRequestId: string;
  amount: string;
  status: PaymentStatus;
  createdAt: string;
}

interface EarningsSummary {
  totalEarnings: string;
  pendingAmount: string;
  completedPayoutCount: number;
  recentPayments: RecentPayment[];
}

const STATUS_TONE: Record<PaymentStatus, BadgeTone> = {
  [PaymentStatus.PENDING]: "warning",
  [PaymentStatus.AUTHORIZED]: "warning",
  [PaymentStatus.CAPTURED]: "success",
  [PaymentStatus.FAILED]: "danger",
  [PaymentStatus.REFUNDED]: "neutral",
};

/** Ch72's mobile Provider app earnings screen — new in this phase (no
 * earnings visibility existed anywhere before). See
 * PaymentService.getEarningsSummaryForProvider()'s comment: in a dev
 * environment with no live payment gateway configured, totalEarnings will
 * honestly read ₹0 until a real webhook captures a payment. */
export function EarningsScreen() {
  const [summary, setSummary] = useState<EarningsSummary | null>(null);

  useFocusEffect(
    useCallback(() => {
      providerApi
        .getEarnings()
        .then((response) => setSummary(response.data as EarningsSummary))
        .catch(() => undefined);
    }, []),
  );

  if (!summary) {
    return <LoadingScreen />;
  }

  return (
    <ScrollView flex={1} bg="$backgroundLight0" contentContainerStyle={{ padding: 24 }}>
      <VStack space="md">
        <Card bg="$primary50" borderColor="$primary200">
          <HStack alignItems="center" space="xs" mb="$1">
            <IndianRupee size={16} color="#4F46E5" />
            <Text color="$primary700" fontWeight="$bold" size="xs">
              TOTAL EARNINGS
            </Text>
          </HStack>
          <Heading size="2xl">₹{summary.totalEarnings}</Heading>
          <Text size="sm" color="$textLight500" mt="$1">
            {summary.completedPayoutCount} paid job{summary.completedPayoutCount === 1 ? "" : "s"} · ₹
            {summary.pendingAmount} pending
          </Text>
        </Card>

        <Text size="sm" color="$textLight500" fontWeight="$semibold">
          Recent payments
        </Text>

        {summary.recentPayments.length === 0 ? (
          <Center py="$8">
            <Text color="$textLight500">No payments yet.</Text>
          </Center>
        ) : (
          <Card p="$0">
            {summary.recentPayments.map((payment, index) => (
              <HStack
                key={payment.id}
                px="$4"
                py="$3"
                justifyContent="space-between"
                alignItems="center"
                borderBottomWidth={index === summary.recentPayments.length - 1 ? 0 : 1}
                borderBottomColor="$borderLight200"
              >
                <VStack>
                  <Text fontWeight="$semibold">₹{payment.amount}</Text>
                  <Text size="sm" color="$textLight500">
                    {new Date(payment.createdAt).toLocaleString()}
                  </Text>
                </VStack>
                <Badge label={payment.status} tone={STATUS_TONE[payment.status]} />
              </HStack>
            ))}
          </Card>
        )}
      </VStack>
    </ScrollView>
  );
}
