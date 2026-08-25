import React, { useEffect, useState } from "react";
import { Heading, HStack, ScrollView, Text, VStack } from "@gluestack-ui/themed";
import * as Location from "expo-location";
import { LifeBuoy, MapPinned } from "lucide-react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { IssueType } from "@motiq/types";
import { CustomerStackParamList } from "../../navigation/types";
import { requestApi } from "../../api/requestApi";
import { consentApi } from "../../api/consentApi";
import { serviceAreaApi } from "../../api/serviceAreaApi";
import { enqueueServiceRequest } from "../../api/offlineQueue";
import { useConnectivityStore } from "../../store/connectivityStore";
import { A11Y_LABELS } from "../../accessibility/a11y";
import { Button, Chip, Input } from "../../components/ui";
import { ISSUE_ICONS } from "../../theme/issueIcons";

type Props = NativeStackScreenProps<CustomerStackParamList, "CreateRequest">;

const ISSUE_TYPES = Object.values(IssueType);

interface ServiceAreaOption {
  id: string;
  name: string;
}

export function CreateRequestScreen({ navigation }: Props) {
  const [serviceAreas, setServiceAreas] = useState<ServiceAreaOption[]>([]);
  const [serviceAreaId, setServiceAreaId] = useState("");
  const [issueType, setIssueType] = useState<IssueType>(IssueType.OTHER);
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const isConnected = useConnectivityStore((state) => state.isConnected);

  useEffect(() => {
    serviceAreaApi
      .list()
      .then((response) => {
        const areas = response.data as ServiceAreaOption[];
        setServiceAreas(areas);
        if (areas.length > 0) {
          setServiceAreaId((current) => current || areas[0].id);
        }
      })
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
      const position = await Location.getCurrentPositionAsync({});
      const dto = {
        serviceAreaId,
        issueType,
        pickupLocation: {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        },
        description: description || undefined,
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
      navigation.navigate("TrackRequest", { serviceRequestId: created.id });
    } catch {
      // A live-but-failing request (server error, not offline) still queues
      // locally rather than losing the attempt.
      await enqueueServiceRequest({
        serviceAreaId,
        issueType,
        pickupLocation: { latitude: 0, longitude: 0 },
        description: description || undefined,
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

        <VStack space="xs">
          <HStack alignItems="center" space="xs">
            <MapPinned size={14} color="#64748B" />
            <Text size="sm" color="$textLight500" fontWeight="$semibold">
              Service area
            </Text>
          </HStack>
          {serviceAreas.length > 0 ? (
            <HStack flexWrap="wrap" gap="$2">
              {serviceAreas.map((area) => (
                <Chip
                  key={area.id}
                  label={area.name}
                  selected={serviceAreaId === area.id}
                  accessibilityLabel={`Service area: ${area.name}`}
                  onPress={() => setServiceAreaId(area.id)}
                />
              ))}
            </HStack>
          ) : (
            <Text color="$textLight500">Loading service areas…</Text>
          )}
        </VStack>

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
          disabled={submitting || !serviceAreaId}
          loading={submitting}
          onPress={handleSubmit}
        />
      </VStack>
    </ScrollView>
  );
}
