import React, { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Text as RNText, Vibration, View } from "react-native";
import { Heading, HStack, Text, VStack } from "@gluestack-ui/themed";
import * as Location from "expo-location";
import * as ImagePicker from "expo-image-picker";
import { Camera, ChevronRight, Sparkles } from "lucide-react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { IssueType, VehicleDto } from "@motiq/types";
import { CustomerStackParamList } from "../../navigation/types";
import { requestApi } from "../../api/requestApi";
import { consentApi } from "../../api/consentApi";
import { vehicleApi } from "../../api/vehicleApi";
import { aiApi, TriageResult } from "../../api/aiApi";
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
const SHEET_SNAPS = [660];
// A model's suggestion is only applied automatically when it is at least this sure.
const AUTO_APPLY_CONFIDENCE = 0.5;
// Base64 text length cap for a photo (the API accepts ~4M; stay well under it).
const MAX_PHOTO_BASE64_CHARS = 3_500_000;

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
  const [triage, setTriage] = useState<TriageResult | null>(null);
  const [triageBusy, setTriageBusy] = useState<"text" | "photo" | null>(null);
  const [triageError, setTriageError] = useState<string | null>(null);
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
    let dto: Parameters<typeof enqueueServiceRequest>[0] | null = null;
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
      dto = {
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
      if (dto) {
        // A live-but-failing request (server error, not offline) still queues
        // locally rather than losing the attempt — with the real pickup point.
        await enqueueServiceRequest(dto);
        setStatus("Couldn't reach MOTIQ right now — your request is saved and will retry automatically.");
      } else {
        // The failure happened before a pickup point existed (location
        // unavailable), so there is nothing valid to queue.
        setStatus("Couldn't determine your location. Check location services and try again.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  function applyTriage(result: TriageResult) {
    setTriage(result);
    if (result.confidence >= AUTO_APPLY_CONFIDENCE) {
      setIssueType(result.issueType);
    }
  }

  async function suggestFromText() {
    const text = description.trim();
    if (text.length < 3 || triageBusy) return;
    setTriageBusy("text");
    setTriageError(null);
    try {
      const response = await aiApi.classifyIssue(text);
      applyTriage(response.data);
    } catch {
      setTriageError("Couldn't get a suggestion right now — please choose the issue below.");
    } finally {
      setTriageBusy(null);
    }
  }

  async function analysePhoto(base64: string, mimeType: string) {
    if (base64.length > MAX_PHOTO_BASE64_CHARS) {
      setTriageError("That photo is too large. Try a closer, smaller one.");
      return;
    }
    setTriageBusy("photo");
    setTriageError(null);
    try {
      const response = await aiApi.diagnosePhoto({ imageBase64: base64, mimeType, note: description.trim() || undefined });
      applyTriage(response.data);
    } catch {
      setTriageError("Couldn't analyse the photo right now — please choose the issue below.");
    } finally {
      setTriageBusy(null);
    }
  }

  async function pickPhoto(source: "camera" | "library") {
    try {
      if (source === "camera") {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted) {
          setTriageError("Camera permission is needed to take a photo.");
          return;
        }
      }
      const options: ImagePicker.ImagePickerOptions = { mediaTypes: ["images"], quality: 0.4, base64: true };
      const result =
        source === "camera" ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
      if (result.canceled || !result.assets[0]?.base64) return;
      const asset = result.assets[0];
      const mime = asset.mimeType === "image/png" || asset.mimeType === "image/webp" ? asset.mimeType : "image/jpeg";
      await analysePhoto(asset.base64 as string, mime);
    } catch {
      setTriageError("Couldn't open the photo. Please try again.");
    }
  }

  function choosePhotoSource() {
    Alert.alert("Add a photo", "Show the problem — a flat tyre, a warning light, damage.", [
      { text: "Take a photo", onPress: () => void pickPhoto("camera") },
      { text: "Choose from gallery", onPress: () => void pickPhoto("library") },
      { text: "Cancel", style: "cancel" },
    ]);
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
            <View style={{ gap: 14 }}>
              <Heading size="xl" color={COLORS.text}>
                What's wrong?
              </Heading>
              <Input
                value={description}
                onChangeText={setDescription}
                placeholder="Describe it (any language)"
                accessibilityLabel="Describe the problem"
              />
              <View style={{ flexDirection: "row", gap: 12, minHeight: 56 }}>
                <View style={{ flex: 1 }}>
                  <Button
                    label={triageBusy === "text" ? "Thinking…" : "Suggest"}
                    icon={Sparkles}
                    variant="outline"
                    accessibilityLabel="Suggest the issue type from my description"
                    disabled={triageBusy !== null || description.trim().length < 3}
                    onPress={suggestFromText}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Button
                    label={triageBusy === "photo" ? "Analysing…" : "Add photo"}
                    icon={Camera}
                    variant="outline"
                    accessibilityLabel="Add a photo of the problem"
                    disabled={triageBusy !== null}
                    onPress={choosePhotoSource}
                  />
                </View>
              </View>
              {triageBusy ? (
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <ActivityIndicator color={COLORS.accent} />
                  <RNText style={{ fontFamily: FONTS.body, fontSize: 13, color: COLORS.textSecondary }}>
                    {triageBusy === "photo" ? "Looking at your photo…" : "Reading your description…"}
                  </RNText>
                </View>
              ) : null}
              {triageError ? <RNText style={{ fontFamily: FONTS.body, fontSize: 13, color: COLORS.warning }}>{triageError}</RNText> : null}
              {triage ? (
                <View
                  style={{
                    backgroundColor: COLORS.surfaceRaised,
                    borderRadius: 16,
                    borderWidth: 1,
                    borderColor: triage.urgency === "HIGH" ? COLORS.danger : COLORS.border,
                    padding: 12,
                    gap: 4,
                  }}
                >
                  <RNText style={{ fontFamily: FONTS.bodyBold, fontSize: 13, color: COLORS.accent }}>
                    {triage.source === "AI" ? "AI suggests" : "Suggested"}: {ISSUE_LABELS[triage.issueType]}
                    {triage.confidence >= AUTO_APPLY_CONFIDENCE ? "" : " (not sure — please check)"}
                    {triage.urgency === "HIGH" ? " · Urgent" : ""}
                  </RNText>
                  {triage.summary ? (
                    <RNText style={{ fontFamily: FONTS.body, fontSize: 14, color: COLORS.text }}>{triage.summary}</RNText>
                  ) : null}
                  {triage.advice ? (
                    <RNText style={{ fontFamily: FONTS.body, fontSize: 13, color: COLORS.textSecondary }}>{triage.advice}</RNText>
                  ) : null}
                </View>
              ) : null}
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
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
              </View>
              <Button label="Next" icon={ChevronRight} onPress={() => setStep(2)} />
            </View>
          ) : null}

          {step === 2 ? (
            <VStack space="md">
              <Heading size="xl" color={COLORS.text}>
                Your vehicle
              </Heading>
              <Text size="sm" color={COLORS.textSecondary}>
                Choosing your vehicle helps the provider arrive prepared.
              </Text>
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
                {description.trim() ? (
                  <View style={rowStyle}>
                    <RNText style={{ fontFamily: FONTS.body, color: COLORS.textSecondary }}>Details</RNText>
                    <RNText
                      numberOfLines={2}
                      style={{ fontFamily: FONTS.bodyBold, color: COLORS.text, flexShrink: 1, textAlign: "right", marginLeft: 24 }}
                    >
                      {description.trim()}
                    </RNText>
                  </View>
                ) : null}
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
