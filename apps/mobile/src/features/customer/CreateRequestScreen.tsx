import React, { useEffect, useState } from "react";
import { Text as RNText, Vibration, View } from "react-native";
import { Heading, HStack, Text, VStack } from "@gluestack-ui/themed";
import * as Location from "expo-location";
import { ChevronRight } from "lucide-react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { IssueType, VehicleDto } from "@motiq/types";
import { CustomerStackParamList } from "../../navigation/types";
import { requestApi } from "../../api/requestApi";
import { consentApi } from "../../api/consentApi";
import { vehicleApi } from "../../api/vehicleApi";
import { enqueueServiceRequest } from "../../api/offlineQueue";
import { useConnectivityStore } from "../../store/connectivityStore";
import { A11Y_LABELS } from "../../accessibility/a11y";
import { BottomSheet, Button, Chip, Input, StepIndicator } from "../../components/ui";
import { MapBackdrop } from "../../components/MapBackdrop";
import { FloatingBackButton } from "../../components/FloatingBackButton";
import { OfflineBanner } from "../../components/OfflineBanner";
import { ISSUE_ICONS, ISSUE_LABELS } from "../../theme/issueIcons";
import { COLORS, FONTS } from "../../theme/colors";
import { useDeviceLocation } from "./useDeviceLocation";

type Props = NativeStackScreenProps<CustomerStackParamList, "CreateRequest">;

const ISSUE_TYPES = Object.values(IssueType);
const TOTAL_STEPS = 3;
const SHEET_SNAPS = [560];

/** Ch71's mobile Customer app request-creation screen, as a 3-step sheet
 * (issue → vehicle and notes → confirm). The service area is derived by the
 * backend from `pickupLocation` (ServiceAreaService.resolveForPoint), so
 * there's nothing here for the customer to pick (CLAUDE.md rule 8). */
export function CreateRequestScreen({ route, navigation }: Props) {
  const [issueType, setIssueType] = useState<IssueType>(route.params?.issueType ?? IssueType.OTHER);
  const [description, setDescription] = useState("");
  const [vehicles, setVehicles] = useState<VehicleDto[]>([]);
  const [vehicleId, setVehicleId] = useState<string | undefined>(route.params?.vehicleId);
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [step, setStep] = useState(1);
  const isConnected = useConnectivityStore((state) => state.isConnected);
  const { position } = useDeviceLocation();

  useEffect(() => {
    vehicleApi
      .listMine()
      .then((response) => setVehicles((response.data as { data: VehicleDto[] }).data))
      .catch(() => undefined);
  }, []);

  async function handleSubmit() {
    if (submitting) return;
    Vibration.vibrate(30);
    setStatus(null);
    setSubmitting(true);
    try {
      const { status: permissionStatus } = await Location.requestForegroundPermissionsAsync();
      if (permissionStatus !== "granted") {
        setStatus("Location permission is required to request assistance.");
        return;
      }
      // See GoOnlineScreen.tsx's identical comment: BestForNavigation forces
      // the GPS provider path, which is what reliably resolves on at least
      // one dev Android emulator config where the default Balanced accuracy
      // hung/rejected indefinitely.
      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.BestForNavigation,
      });
      const dto = {
        issueType,
        pickupLocation: {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        },
        description: description || undefined,
        vehicleId,
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
      navigation.navigate("Matching", { serviceRequestId: created.id });
    } catch {
      // A live-but-failing request (server error, not offline) still queues
      // locally rather than losing the attempt.
      await enqueueServiceRequest({
        issueType,
        pickupLocation: { latitude: 0, longitude: 0 },
        description: description || undefined,
        vehicleId,
      });
      setStatus("Couldn't reach MOTIQ right now — your request is saved and will retry automatically.");
    } finally {
      setSubmitting(false);
    }
  }

  const selectedVehicle = vehicles.find((v) => v.id === vehicleId);
  const IssueIcon = ISSUE_ICONS[issueType];

  function goBack() {
    if (step > 1) setStep(step - 1);
    else navigation.goBack();
  }

  const rowStyle = {
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  };

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <MapBackdrop position={position} bottomInset={SHEET_SNAPS[0] + 16}>
        <View pointerEvents="box-none" style={{ gap: 10 }}>
          <View style={{ flexDirection: "row" }}>
            <FloatingBackButton onPress={goBack} />
          </View>
          <OfflineBanner />
        </View>
      </MapBackdrop>
      <View
        pointerEvents="none"
        style={{ position: "absolute", top: 0, bottom: 0, left: 0, right: 0, backgroundColor: "rgba(11,11,15,0.45)" }}
      />

      <BottomSheet snapPoints={SHEET_SNAPS}>
        <VStack space="lg">
          <VStack space="sm">
            <StepIndicator total={TOTAL_STEPS} current={step} />
            <Text size="xs" color={COLORS.textSecondary}>
              Step {step} of {TOTAL_STEPS}
            </Text>
          </VStack>

          {step === 1 ? (
            <VStack space="md">
              <Heading size="xl" color={COLORS.text}>
                What's wrong?
              </Heading>
              <HStack flexWrap="wrap" gap="$2">
                {ISSUE_TYPES.map((type) => (
                  <Chip
                    key={type}
                    label={ISSUE_LABELS[type]}
                    icon={ISSUE_ICONS[type]}
                    selected={issueType === type}
                    accessibilityLabel={`Issue type: ${type}`}
                    onPress={() => setIssueType(type)}
                  />
                ))}
              </HStack>
              <Button label="Next" icon={ChevronRight} onPress={() => setStep(2)} />
            </VStack>
          ) : null}

          {step === 2 ? (
            <VStack space="md">
              <Heading size="xl" color={COLORS.text}>
                Your vehicle
              </Heading>
              {vehicles.length > 0 ? (
                <HStack flexWrap="wrap" gap="$2">
                  <Chip
                    label="Not specified"
                    selected={!vehicleId}
                    accessibilityLabel="No vehicle specified"
                    onPress={() => setVehicleId(undefined)}
                  />
                  {vehicles.map((vehicle) => (
                    <Chip
                      key={vehicle.id}
                      label={`${vehicle.make} ${vehicle.model}`}
                      selected={vehicleId === vehicle.id}
                      accessibilityLabel={`Vehicle: ${vehicle.make} ${vehicle.model}`}
                      onPress={() => setVehicleId(vehicle.id)}
                    />
                  ))}
                </HStack>
              ) : null}
              <Input
                label="Description (optional)"
                value={description}
                onChangeText={setDescription}
                placeholder="Anything the provider should know"
                multiline
              />
              <Button label="Next" icon={ChevronRight} onPress={() => setStep(3)} />
            </VStack>
          ) : null}

          {step === 3 ? (
            <VStack space="md">
              <Heading size="xl" color={COLORS.text}>
                Review your request
              </Heading>
              <View>
                <View style={rowStyle}>
                  <RNText style={{ fontFamily: FONTS.body, color: COLORS.textSecondary }}>Issue</RNText>
                  <RNText style={{ fontFamily: FONTS.bodyBold, color: COLORS.text }}>{ISSUE_LABELS[issueType]}</RNText>
                </View>
                <View style={rowStyle}>
                  <RNText style={{ fontFamily: FONTS.body, color: COLORS.textSecondary }}>Vehicle</RNText>
                  <RNText style={{ fontFamily: FONTS.bodyBold, color: COLORS.text }}>
                    {selectedVehicle ? `${selectedVehicle.make} ${selectedVehicle.model}` : "Not specified"}
                  </RNText>
                </View>
                <View style={rowStyle}>
                  <RNText style={{ fontFamily: FONTS.body, color: COLORS.textSecondary }}>Pickup</RNText>
                  <RNText style={{ fontFamily: FONTS.bodyBold, color: COLORS.text }}>Your current location</RNText>
                </View>
              </View>
              <Text size="sm" color={COLORS.textSecondary}>
                Final fare is calculated when the job completes — you'll see the full breakdown before you pay.
              </Text>

              {status ? (
                <Text color={COLORS.warning} size="sm">
                  {status}
                </Text>
              ) : null}

              <Button
                label={submitting ? "Requesting…" : "Confirm & find provider"}
                icon={IssueIcon}
                accessibilityLabel={A11Y_LABELS.createRequestButton}
                disabled={submitting}
                loading={submitting}
                onPress={handleSubmit}
              />
            </VStack>
          ) : null}
        </VStack>
      </BottomSheet>
    </View>
  );
}
