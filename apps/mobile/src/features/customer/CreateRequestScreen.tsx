import React, { useEffect, useState } from "react";
import { Heading, HStack, ScrollView, Text, VStack } from "@gluestack-ui/themed";
import * as Location from "expo-location";
import { Car, LifeBuoy } from "lucide-react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { IssueType, VehicleDto } from "@motiq/types";
import { CustomerStackParamList } from "../../navigation/types";
import { requestApi } from "../../api/requestApi";
import { consentApi } from "../../api/consentApi";
import { vehicleApi } from "../../api/vehicleApi";
import { enqueueServiceRequest } from "../../api/offlineQueue";
import { useConnectivityStore } from "../../store/connectivityStore";
import { A11Y_LABELS } from "../../accessibility/a11y";
import { Button, Chip, Input } from "../../components/ui";
import { ISSUE_ICONS } from "../../theme/issueIcons";

type Props = NativeStackScreenProps<CustomerStackParamList, "CreateRequest">;

const ISSUE_TYPES = Object.values(IssueType);

/** Ch71's mobile Customer app request-creation screen. Previously let the
 * customer hand-pick a "service area" from a chip list, which became the
 * request's authoritative city — exactly the client-trust gap CLAUDE.md rule
 * 8 flags. The backend now derives the service area from `pickupLocation`
 * itself (ServiceAreaService.resolveForPoint), so there's nothing left for
 * this screen to ask the customer to pick. */
export function CreateRequestScreen({ route, navigation }: Props) {
  const [issueType, setIssueType] = useState<IssueType>(IssueType.OTHER);
  const [description, setDescription] = useState("");
  const [vehicles, setVehicles] = useState<VehicleDto[]>([]);
  const [vehicleId, setVehicleId] = useState<string | undefined>(route.params?.vehicleId);
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const isConnected = useConnectivityStore((state) => state.isConnected);

  useEffect(() => {
    vehicleApi
      .listMine()
      .then((response) => setVehicles((response.data as { data: VehicleDto[] }).data))
      .catch(() => undefined);
  }, []);

  async function handleSubmit() {
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

  return (
    <ScrollView flex={1} bg="$backgroundLight0" contentContainerStyle={{ padding: 24 }}>
      <VStack space="lg">
        <VStack space="xs">
          <Heading size="xl">Request assistance</Heading>
          <Text color="$textLight500">Tell us what's wrong and where you are.</Text>
        </VStack>

        {!isConnected ? (
          <Text bg="$warning100" color="$warning700" p="$2" borderRadius="$md" textAlign="center" fontWeight="$semibold">
            You're offline
          </Text>
        ) : null}

        <VStack space="xs">
          <HStack alignItems="center" space="xs">
            <LifeBuoy size={14} color="#64748B" />
            <Text size="sm" color="$textLight500" fontWeight="$semibold">
              What's wrong?
            </Text>
          </HStack>
          <HStack flexWrap="wrap" gap="$2">
            {ISSUE_TYPES.map((type) => (
              <Chip
                key={type}
                label={type.replace("_", " ")}
                icon={ISSUE_ICONS[type]}
                selected={issueType === type}
                accessibilityLabel={`Issue type: ${type}`}
                onPress={() => setIssueType(type)}
              />
            ))}
          </HStack>
        </VStack>

        {vehicles.length > 0 ? (
          <VStack space="xs">
            <HStack alignItems="center" space="xs">
              <Car size={14} color="#64748B" />
              <Text size="sm" color="$textLight500" fontWeight="$semibold">
                Vehicle (optional)
              </Text>
            </HStack>
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
          </VStack>
        ) : null}

        <Input
          label="Description (optional)"
          value={description}
          onChangeText={setDescription}
          placeholder="Anything the provider should know"
          multiline
        />

        {status ? (
          <Text color="$textLight700" size="sm">
            {status}
          </Text>
        ) : null}

        <Button
          label={submitting ? "Requesting…" : "Request assistance"}
          variant="danger"
          icon={LifeBuoy}
          accessibilityLabel={A11Y_LABELS.createRequestButton}
          disabled={submitting}
          loading={submitting}
          onPress={handleSubmit}
        />
      </VStack>
    </ScrollView>
  );
}
