import React, { useCallback, useState } from "react";
import { Box, Center, Heading, HStack, Pressable, ScrollView, Text, VStack } from "@gluestack-ui/themed";
import { useFocusEffect } from "@react-navigation/native";
import type { CompositeScreenProps } from "@react-navigation/native";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Car, LifeBuoy, Navigation, Plus } from "lucide-react-native";
import { IssueType, RequestStatus, VehicleDto } from "@motiq/types";
import { CustomerStackParamList, CustomerTabParamList } from "../../navigation/types";
import { requestApi } from "../../api/requestApi";
import { customerApi } from "../../api/customerApi";
import { vehicleApi } from "../../api/vehicleApi";
import { A11Y_LABELS } from "../../accessibility/a11y";
import { Badge, Button, Card, Chip } from "../../components/ui";
import { ISSUE_ICONS } from "../../theme/issueIcons";
import { SosButton } from "../sos/SosButton";
import { statusBadgeTone } from "./statusBadgeTone";

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

const RECENT_ACTIVITY_LIMIT = 3;

interface RequestRow {
  id: string;
  issueType: IssueType;
  status: RequestStatus;
  createdAt: string;
}

/** Ch71's mobile Customer app Home tab — the request CTA plus a banner for
 * whatever active request already exists, an always-reachable SOS button
 * (Ch55 — safety access shouldn't wait for a job to already be in progress),
 * a nudge to save a vehicle, a quick vehicle picker, and recent activity so
 * the screen isn't blank the moment nothing is in progress. */
export function CustomerHomeScreen({ navigation }: Props) {
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [activeRequest, setActiveRequest] = useState<RequestRow | null>(null);
  const [recentRequests, setRecentRequests] = useState<RequestRow[]>([]);
  const [vehicles, setVehicles] = useState<VehicleDto[]>([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | undefined>(undefined);

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
          const active = body.data.find((r) => !TERMINAL_STATUSES.has(r.status)) ?? null;
          setActiveRequest(active);
          setRecentRequests(
            body.data.filter((r) => r.id !== active?.id && TERMINAL_STATUSES.has(r.status)).slice(0, RECENT_ACTIVITY_LIMIT),
          );
        })
        .catch(() => undefined);

      vehicleApi
        .listMine()
        .then((response) => {
          const ownedVehicles = (response.data as { data: VehicleDto[] }).data;
          setVehicles(ownedVehicles);
          setSelectedVehicleId((current) => current ?? ownedVehicles[0]?.id);
        })
        .catch(() => undefined);
    }, []),
  );

  const ActiveIcon = activeRequest ? ISSUE_ICONS[activeRequest.issueType] : null;

  return (
    <ScrollView flex={1} bg="$backgroundLight0" contentContainerStyle={{ padding: 24 }}>
      <VStack space="md">
        <HStack alignItems="center" justifyContent="space-between">
          <VStack space="xs" flex={1}>
            <Heading size="2xl">{displayName ? `Hi, ${displayName}` : "Welcome"}</Heading>
            <Text color="$textLight500">Need a hand on the road?</Text>
          </VStack>
          <SosButton serviceRequestId={activeRequest?.id} />
        </HStack>

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

        {vehicles.length === 0 ? (
          <Card>
            <HStack alignItems="center" space="md">
              <Center w={40} h={40} borderRadius="$full" bg="$primary50">
                <Car size={20} color="#4F46E5" />
              </Center>
              <VStack flex={1}>
                <Text fontWeight="$bold" color="$textLight900">
                  Add your vehicle
                </Text>
                <Text size="sm" color="$textLight500">
                  Save its details so providers know what they're helping with.
                </Text>
              </VStack>
            </HStack>
            <Box mt="$3">
              <Button
                label="Add a vehicle"
                variant="outline"
                icon={Plus}
                accessibilityLabel={A11Y_LABELS.addVehicleButton}
                onPress={() => navigation.navigate("AddVehicle", undefined)}
              />
            </Box>
          </Card>
        ) : (
          <VStack space="xs">
            <Text size="sm" color="$textLight500" fontWeight="$semibold">
              Vehicle
            </Text>
            <HStack flexWrap="wrap" gap="$2">
              {vehicles.map((vehicle) => (
                <Chip
                  key={vehicle.id}
                  label={`${vehicle.make} ${vehicle.model}`}
                  selected={selectedVehicleId === vehicle.id}
                  accessibilityLabel={`Vehicle: ${vehicle.make} ${vehicle.model}`}
                  onPress={() => setSelectedVehicleId(vehicle.id)}
                />
              ))}
            </HStack>
          </VStack>
        )}

        {recentRequests.length > 0 ? (
          <VStack space="xs">
            <Text size="sm" color="$textLight500" fontWeight="$semibold">
              Recent activity
            </Text>
            <Card p="$0">
              {recentRequests.map((request, index) => (
                <Pressable
                  key={request.id}
                  px="$4"
                  py="$3"
                  borderBottomWidth={index === recentRequests.length - 1 ? 0 : 1}
                  borderBottomColor="$borderLight200"
                  accessibilityRole="button"
                  accessibilityLabel={`View ${request.issueType.replace("_", " ")} request from ${new Date(request.createdAt).toLocaleDateString()}`}
                  onPress={() => navigation.navigate("RequestDetail", { serviceRequestId: request.id })}
                >
                  <HStack alignItems="center" justifyContent="space-between">
                    <Text fontWeight="$semibold" size="md" textTransform="capitalize">
                      {request.issueType.replace("_", " ")}
                    </Text>
                    <Badge label={request.status.replace(/_/g, " ")} tone={statusBadgeTone(request.status)} />
                  </HStack>
                  <Text size="sm" color="$textLight500" mt="$1">
                    {new Date(request.createdAt).toLocaleString()}
                  </Text>
                </Pressable>
              ))}
            </Card>
          </VStack>
        ) : null}

        <VStack mt="$2" space="sm">
          <Button
            label="Request assistance"
            variant="danger"
            icon={LifeBuoy}
            accessibilityLabel={A11Y_LABELS.createRequestButton}
            onPress={() => navigation.navigate("CreateRequest", { vehicleId: selectedVehicleId })}
          />
        </VStack>
      </VStack>
    </ScrollView>
  );
}
