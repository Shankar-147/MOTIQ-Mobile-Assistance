import React, { useEffect, useState } from "react";
import { Heading, HStack, ScrollView, Text, VStack } from "@gluestack-ui/themed";
import { Car } from "lucide-react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { VehicleDto, VehicleType } from "@motiq/types";
import { CustomerStackParamList } from "../../navigation/types";
import { vehicleApi } from "../../api/vehicleApi";
import { useAuthStore } from "../../store/authStore";
import { A11Y_LABELS } from "../../accessibility/a11y";
import { Button, Chip, Input } from "../../components/ui";
import { markVehicleOnboardingSeen } from "./vehicleOnboarding";

type Props = NativeStackScreenProps<CustomerStackParamList, "AddVehicle" | "VehicleOnboarding">;

const VEHICLE_TYPES = Object.values(VehicleType);

/** Ch71's mobile Customer app — used both as the skippable first-login
 * onboarding step (route name "VehicleOnboarding", CustomerNavigator's
 * initialRouteName for a first-time customer) and as the "add/edit vehicle"
 * screen pushed from Profile as "AddVehicle" (optional `vehicleId` to edit).
 * Onboarding-ness comes from route.name, not a param — an initialRouteName
 * never receives navigate()-style params, so a shared route with an
 * "onboarding" param would see it as undefined here. */
export function AddEditVehicleScreen({ route, navigation }: Props) {
  const onboarding = route.name === "VehicleOnboarding";
  const vehicleId = route.name === "AddVehicle" ? route.params?.vehicleId : undefined;
  const userId = useAuthStore((state) => state.user?.userId);

  const [vehicleType, setVehicleType] = useState<VehicleType>(VehicleType.CAR);
  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const [year, setYear] = useState("");
  const [plateNumber, setPlateNumber] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    if (!vehicleId) {
      return;
    }
    vehicleApi
      .listMine()
      .then((response) => {
        const vehicles = (response.data as { data: VehicleDto[] }).data;
        const existing = vehicles.find((vehicle) => vehicle.id === vehicleId);
        if (existing) {
          setVehicleType(existing.vehicleType);
          setMake(existing.make);
          setModel(existing.model);
          setYear(existing.year ? String(existing.year) : "");
          setPlateNumber(existing.plateNumber);
        }
      })
      .catch(() => undefined);
  }, [vehicleId]);

  async function finishOnboarding() {
    if (onboarding && userId) {
      await markVehicleOnboardingSeen(userId);
    }
  }

  async function handleSkip() {
    await finishOnboarding();
    navigation.replace("MainTabs");
  }

  async function handleSave() {
    setStatus(null);
    setSubmitting(true);
    try {
      const dto = {
        vehicleType,
        make,
        model,
        year: year ? Number(year) : undefined,
        plateNumber,
      };
      if (vehicleId) {
        await vehicleApi.update(vehicleId, dto);
      } else {
        await vehicleApi.create(dto);
      }
      await finishOnboarding();
      if (onboarding) {
        navigation.replace("MainTabs");
      } else {
        navigation.goBack();
      }
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
          <Heading size="xl">{vehicleId ? "Edit vehicle" : "Add your vehicle"}</Heading>
          <Text color="$textLight500">
            {onboarding
              ? "Add the vehicle you'll usually need help with. You can skip this and add it later from your profile."
              : "Vehicle details help providers arrive prepared."}
          </Text>
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

        <Input label="Make" value={make} onChangeText={setMake} placeholder="e.g. Maruti Suzuki" />
        <Input label="Model" value={model} onChangeText={setModel} placeholder="e.g. Swift" />
        <Input label="Year (optional)" value={year} onChangeText={setYear} placeholder="e.g. 2020" />
        <Input label="Plate number" value={plateNumber} onChangeText={setPlateNumber} placeholder="e.g. KA01AB1234" />

        {status ? (
          <Text color="$textLight700" size="sm">
            {status}
          </Text>
        ) : null}

        <Button
          label={submitting ? "Saving…" : "Save vehicle"}
          icon={Car}
          accessibilityLabel={A11Y_LABELS.saveVehicleButton}
          disabled={submitting || !make || !model || !plateNumber}
          loading={submitting}
          onPress={handleSave}
        />

        {onboarding ? (
          <Button
            label="Skip for now"
            variant="outline"
            accessibilityLabel={A11Y_LABELS.skipVehicleOnboardingButton}
            disabled={submitting}
            onPress={handleSkip}
          />
        ) : null}
      </VStack>
    </ScrollView>
  );
}
