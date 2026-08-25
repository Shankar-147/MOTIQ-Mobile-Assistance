import React, { useCallback, useState } from "react";
import { Center, Heading, HStack, Text, VStack } from "@gluestack-ui/themed";
import { useFocusEffect } from "@react-navigation/native";
import type { CompositeScreenProps } from "@react-navigation/native";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { LifeBuoy, Navigation } from "lucide-react-native";
import { IssueType, RequestStatus } from "@motiq/types";
import { CustomerStackParamList, CustomerTabParamList } from "../../navigation/types";
import { requestApi } from "../../api/requestApi";
import { customerApi } from "../../api/customerApi";
import { A11Y_LABELS } from "../../accessibility/a11y";
import { Button, Card } from "../../components/ui";
import { ISSUE_ICONS } from "../../theme/issueIcons";

type Props = CompositeScreenProps<
  BottomTabScreenProps<CustomerTabParamList, "Home">,
  NativeStackScreenProps<CustomerStackParamList>
>;

const TERMINAL_STATUSES = new Set<RequestStatus>([
  RequestStatus.COMPLETED,
  RequestStatus.CANCELLED_BY_CUSTOMER,
  RequestStatus.CANCELLED_BY_PROVIDER,
  RequestStatus.EXPIRED,
  RequestStatus.FAILED,
]);

interface RequestRow {
  id: string;
  issueType: IssueType;
  status: RequestStatus;
}

/** Ch71's mobile Customer app Home tab — the request CTA plus a banner for
 * whatever active request already exists, so a customer with a live job
 * isn't stuck staring at a blank "request assistance" form. */
export function CustomerHomeScreen({ navigation }: Props) {
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [activeRequest, setActiveRequest] = useState<RequestRow | null>(null);

  useFocusEffect(
    useCallback(() => {
      customerApi
        .getOwnProfile()
        .then((response) => setDisplayName((response.data as { displayName: string }).displayName))
        .catch(() => undefined);

      requestApi
        .listMine({ limit: 5 })
        .then((response) => {
          const body = response.data as { data: RequestRow[] };
          setActiveRequest(body.data.find((r) => !TERMINAL_STATUSES.has(r.status)) ?? null);
        })
        .catch(() => undefined);
    }, []),
  );

  const ActiveIcon = activeRequest ? ISSUE_ICONS[activeRequest.issueType] : null;

  return (
    <VStack flex={1} bg="$backgroundLight0" p="$6" space="md">
      <VStack space="xs">
        <Heading size="2xl">{displayName ? `Hi, ${displayName}` : "Welcome"}</Heading>
        <Text color="$textLight500">Need a hand on the road?</Text>
      </VStack>

      {activeRequest && ActiveIcon ? (
        <Card borderColor="$primary200" bg="$primary50">
          <HStack alignItems="center" space="sm" mb="$3">
            <Center w={40} h={40} borderRadius="$full" bg="$primary600">
              <ActiveIcon size={20} color="#FFFFFF" />
            </Center>
            <VStack flex={1}>
              <Text color="$primary700" fontWeight="$bold" size="xs">
                ACTIVE REQUEST
              </Text>
              <Heading size="md">{activeRequest.issueType.replace("_", " ")}</Heading>
            </VStack>
          </HStack>
          <Text color="$textLight500" mb="$3" textTransform="capitalize">
            {activeRequest.status.replace(/_/g, " ")}
          </Text>
          <Button
            label="Track it"
            icon={Navigation}
            onPress={() => navigation.navigate("TrackRequest", { serviceRequestId: activeRequest.id })}
          />
        </Card>
      ) : null}

      <VStack mt="auto" space="sm">
        <Button
          label="Request assistance"
          variant="danger"
          icon={LifeBuoy}
          accessibilityLabel={A11Y_LABELS.createRequestButton}
          onPress={() => navigation.navigate("CreateRequest")}
        />
      </VStack>
    </VStack>
  );
}
