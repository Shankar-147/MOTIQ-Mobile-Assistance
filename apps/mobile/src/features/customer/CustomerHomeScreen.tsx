import React, { useCallback, useState } from "react";
import { Pressable, Text as RNText, View } from "react-native";
import { Box, Center, Heading, HStack, Text, VStack } from "@gluestack-ui/themed";
import { useFocusEffect } from "@react-navigation/native";
import type { CompositeScreenProps } from "@react-navigation/native";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Car, Navigation, Plus } from "lucide-react-native";
import { IssueType, RequestStatus, VehicleDto } from "@motiq/types";
import { CustomerStackParamList, CustomerTabParamList } from "../../navigation/types";
import { requestApi } from "../../api/requestApi";
import { customerApi } from "../../api/customerApi";
import { vehicleApi } from "../../api/vehicleApi";
import { A11Y_LABELS, MIN_TOUCH_TARGET_SIZE } from "../../accessibility/a11y";
import { Badge, BottomSheet, Button, Card, Chip, PulseDot } from "../../components/ui";
import { MapBackdrop } from "../../components/MapBackdrop";
import { OfflineBanner } from "../../components/OfflineBanner";
import { ISSUE_ICONS, ISSUE_LABELS } from "../../theme/issueIcons";
import { COLORS, FONTS } from "../../theme/colors";
import { SosButton } from "../sos/SosButton";
import { statusBadgeTone } from "./statusBadgeTone";
import { useDeviceLocation } from "./useDeviceLocation";

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
const ISSUE_TYPES = Object.values(IssueType);
const SHEET_SNAPS = [330, 600];

interface RequestRow {
  id: string;
  issueType: IssueType;
  status: RequestStatus;
  createdAt: string;
}

/** Ch71's Customer Home — map-first. The detected location sits behind a
 * draggable sheet holding the issue picker, vehicle chips, the active-request
 * banner and recent activity; SOS floats top-right (Ch55 — safety access
 * never waits on a job). */
export function CustomerHomeScreen({ navigation }: Props) {
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [activeRequest, setActiveRequest] = useState<RequestRow | null>(null);
  const [recentRequests, setRecentRequests] = useState<RequestRow[]>([]);
  const [vehicles, setVehicles] = useState<VehicleDto[]>([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | undefined>(undefined);
  const [issueType, setIssueType] = useState<IssueType | null>(null);
  const { position, permission, request: requestLocation } = useDeviceLocation();

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
    <View style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <MapBackdrop position={position} bottomInset={SHEET_SNAPS[0] + 16}>
        <View pointerEvents="box-none" style={{ gap: 10 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <View style={{ flex: 1, paddingRight: 12 }}>
              <RNText numberOfLines={1} style={{ fontFamily: FONTS.display, fontSize: 18, color: COLORS.text }}>
                {displayName ? `Hi, ${displayName}` : "MOTIQ"}
              </RNText>
            </View>
            <SosButton serviceRequestId={activeRequest?.id} />
          </View>
          <OfflineBanner />
        </View>
      </MapBackdrop>

      <BottomSheet snapPoints={SHEET_SNAPS}>
        <VStack space="md">
          <Heading size="xl" color={COLORS.text}>
            What's wrong?
          </Heading>

          {permission === "granted" ? (
            <HStack alignItems="center" space="sm" bg={COLORS.surfaceRaised} borderRadius={14} px="$3" py="$2">
              <PulseDot />
              <Text size="sm" color={COLORS.textSecondary}>
                Using your current location
              </Text>
            </HStack>
          ) : (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Enable location"
              onPress={requestLocation}
              style={{
                minHeight: MIN_TOUCH_TARGET_SIZE,
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
                backgroundColor: COLORS.surfaceRaised,
                borderRadius: 14,
                paddingHorizontal: 12,
              }}
            >
              <PulseDot color={COLORS.warning} />
              <RNText style={{ flex: 1, fontFamily: FONTS.body, fontSize: 14, color: COLORS.text }}>
                Enable location to be found faster
              </RNText>
            </Pressable>
          )}

          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {ISSUE_TYPES.map((type) => {
              const Icon = ISSUE_ICONS[type];
              const selected = issueType === type;
              return (
                <Pressable
                  key={type}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  accessibilityLabel={`Issue type: ${ISSUE_LABELS[type]}`}
                  onPress={() => setIssueType(type)}
                  style={{
                    width: "31.5%",
                    minHeight: 80,
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 6,
                    borderRadius: 16,
                    borderWidth: 1,
                    borderColor: selected ? COLORS.accent : COLORS.border,
                    backgroundColor: selected ? COLORS.accentTint : COLORS.surfaceRaised,
                  }}
                >
                  <Icon size={22} color={selected ? COLORS.accent : COLORS.text} />
                  <RNText
                    style={{
                      fontFamily: FONTS.bodyBold,
                      fontSize: 12.5,
                      color: selected ? COLORS.accent : COLORS.text,
                    }}
                  >
                    {ISSUE_LABELS[type]}
                  </RNText>
                </Pressable>
              );
            })}
          </View>

          {vehicles.length === 0 ? (
            <Card>
              <HStack alignItems="center" space="md">
                <Center w={40} h={40} borderRadius="$full" bg={COLORS.accentTint}>
                  <Car size={20} color={COLORS.accent} />
                </Center>
                <VStack flex={1}>
                  <Text fontWeight="$bold" color={COLORS.text}>
                    Add your vehicle
                  </Text>
                  <Text size="sm" color={COLORS.textSecondary}>
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
              <Text size="sm" color={COLORS.textSecondary} fontWeight="$semibold">
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

          <Button
            label="Continue"
            disabled={!issueType}
            accessibilityLabel={A11Y_LABELS.createRequestButton}
            onPress={() => navigation.navigate("CreateRequest", { vehicleId: selectedVehicleId, issueType: issueType ?? undefined })}
          />

          {activeRequest && ActiveIcon ? (
            <Card borderColor={COLORS.accent} bg={COLORS.accentTint}>
              <HStack alignItems="center" space="sm" mb="$3">
                <Center w={40} h={40} borderRadius="$full" bg={COLORS.accent}>
                  <ActiveIcon size={20} color={COLORS.accentInk} />
                </Center>
                <VStack flex={1}>
                  <HStack alignItems="center" space="xs">
                    <PulseDot />
                    <Text color={COLORS.accent} fontWeight="$bold" size="xs">
                      ACTIVE REQUEST
                    </Text>
                  </HStack>
                  <Heading size="md" color={COLORS.text}>
                    {ISSUE_LABELS[activeRequest.issueType]}
                  </Heading>
                </VStack>
              </HStack>
              <Text color={COLORS.textSecondary} mb="$3" textTransform="capitalize">
                {activeRequest.status.replace(/_/g, " ").toLowerCase()}
              </Text>
              <Button
                label="Track it"
                icon={Navigation}
                onPress={() => navigation.navigate("TrackRequest", { serviceRequestId: activeRequest.id })}
              />
            </Card>
          ) : null}

          {recentRequests.length > 0 ? (
            <VStack space="xs">
              <Text size="sm" color={COLORS.textSecondary} fontWeight="$semibold">
                Recent activity
              </Text>
              <Card p="$0">
                {recentRequests.map((request, index) => (
                  <Pressable
                    key={request.id}
                    style={{
                      paddingHorizontal: 16,
                      paddingVertical: 12,
                      borderBottomWidth: index === recentRequests.length - 1 ? 0 : 1,
                      borderBottomColor: COLORS.border,
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={`View ${ISSUE_LABELS[request.issueType]} request from ${new Date(request.createdAt).toLocaleDateString()}`}
                    onPress={() => navigation.navigate("RequestDetail", { serviceRequestId: request.id })}
                  >
                    <HStack alignItems="center" justifyContent="space-between">
                      <Text fontWeight="$semibold" size="md" color={COLORS.text}>
                        {ISSUE_LABELS[request.issueType]}
                      </Text>
                      <Badge label={request.status.replace(/_/g, " ").toLowerCase()} tone={statusBadgeTone(request.status)} />
                    </HStack>
                    <Text size="sm" color={COLORS.textSecondary} mt="$1">
                      {new Date(request.createdAt).toLocaleString()}
                    </Text>
                  </Pressable>
                ))}
              </Card>
            </VStack>
          ) : null}
        </VStack>
      </BottomSheet>
    </View>
  );
}
