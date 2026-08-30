import React, { useEffect, useState } from "react";
import { Heading, HStack, ScrollView, Text, VStack } from "@gluestack-ui/themed";
import { Truck } from "lucide-react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { ProviderFleetVehicleDto, VehicleType } from "@motiq/types";
import { ProviderStackParamList } from "../../navigation/types";
import { providerFleetVehicleApi } from "../../api/providerFleetVehicleApi";
import { A11Y_LABELS } from "../../accessibility/a11y";
import { Button, Chip, Input } from "../../components/ui";

type Props = NativeStackScreenProps<ProviderStackParamList, "AddFleetVehicle">;

const VEHICLE_TYPES = Object.values(VehicleType);

/** Ch72's mobile Provider app Profile screen — add/edit a ProviderFleetVehicle,
 * the fleet-vehicle equivalent of AddEditVehicleScreen. Simpler than its
 * Customer counterpart: no onboarding mode (no forced first-login step for
 * providers), no `year` field (ProviderFleetVehicle has none). */
export function AddEditFleetVehicleScreen({ route, navigation }: Props) {
  const vehicleId = route.params?.vehicleId;

  const [vehicleType, setVehicleType] = useState<VehicleType>(VehicleType.COMMERCIAL);
  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const [plateNumber, setPlateNumber] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    if (!vehicleId) {
      return;
    }
    providerFleetVehicleApi
      .listMine()
      .then((response) => {
        const vehicles = (response.data as { data: ProviderFleetVehicleDto[] }).data;
        const existing = vehicles.find((vehicle) => vehicle.id === vehicleId);
        if (existing) {
          setVehicleType(existing.vehicleType);
          setMake(existing.make);
          setModel(existing.model);
          setPlateNumber(existing.plateNumber);
        }
      })
      .catch(() => undefined);
  }, [vehicleId]);

  async function handleSave() {
    setStatus(null);
    setSubmitting(true);
    try {
      const dto = { vehicleType, make, model, plateNumber };
      if (vehicleId) {
        await providerFleetVehicleApi.update(vehicleId, dto);
      } else {
        await providerFleetVehicleApi.create(dto);
      }
      navigation.goBack();
    } catch {
      setStatus("Couldn't save this vehicle — check the details and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ScrollView flex={1} bg="$backgroundLight0" contentContainerStyle={{ padding: 24 }}>
      <VStack space="lg">
        <VStack space="xs">
          <Heading size="xl">{vehicleId ? "Edit fleet vehicle" : "Add a fleet vehicle"}</Heading>
          <Text color="$textLight500">Keep your fleet up to date for job matching.</Text>
        </VStack>

        <VStack space="xs">
          <Text size="sm" color="$textLight500" fontWeight="$semibold">
            Vehicle type
          </Text>
          <HStack space="sm">
            {VEHICLE_TYPES.map((type) => (
              <Chip
                key={type}
                label={type.replace("_", " ")}
                selected={vehicleType === type}
                accessibilityLabel={`Vehicle type: ${type}`}
                onPress={() => setVehicleType(type)}
              />
            ))}
          </HStack>
        </VStack>

        <Input label="Make" value={make} onChangeText={setMake} placeholder="e.g. Tata" />
        <Input label="Model" value={model} onChangeText={setModel} placeholder="e.g. Ace" />
        <Input label="Plate number" value={plateNumber} onChangeText={setPlateNumber} placeholder="e.g. KA01AB1234" />

        {status ? (
          <Text color="$textLight700" size="sm">
            {status}
          </Text>
        ) : null}

        <Button
          label={submitting ? "Saving…" : "Save vehicle"}
          icon={Truck}
          accessibilityLabel={A11Y_LABELS.saveFleetVehicleButton}
          disabled={submitting || !make || !model || !plateNumber}
          loading={submitting}
          onPress={handleSave}
        />
      </VStack>
    </ScrollView>
  );
}
