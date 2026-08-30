import React, { useState } from "react";
import { Heading, HStack, ScrollView, Text, VStack } from "@gluestack-ui/themed";
import { Wrench } from "lucide-react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { MaintenanceServiceType } from "@motiq/types";
import { CustomerStackParamList } from "../../navigation/types";
import { vehicleApi } from "../../api/vehicleApi";
import { A11Y_LABELS } from "../../accessibility/a11y";
import { MAINTENANCE_ICONS } from "../../theme/maintenanceIcons";
import { Button, Chip, Input } from "../../components/ui";

type Props = NativeStackScreenProps<CustomerStackParamList, "AddMaintenanceRecord">;

const SERVICE_TYPES = Object.values(MaintenanceServiceType);

/** Ch71's mobile Customer app — logs one preventive-maintenance service
 * record against a vehicle. No date field: servicedAt defaults to now
 * server-side, keeping this v1 form lean. */
export function AddMaintenanceRecordScreen({ route, navigation }: Props) {
  const { vehicleId } = route.params;

  const [serviceType, setServiceType] = useState<MaintenanceServiceType>(MaintenanceServiceType.GENERAL_SERVICE);
  const [odometerKm, setOdometerKm] = useState("");
  const [cost, setCost] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  async function handleSave() {
    setStatus(null);
    setSubmitting(true);
    try {
      await vehicleApi.addMaintenanceRecord(vehicleId, {
        serviceType,
        odometerKm: Number(odometerKm),
        cost: cost || undefined,
        notes: notes || undefined,
      });
      navigation.goBack();
    } catch {
      setStatus("Couldn't save this record — check the details and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ScrollView flex={1} bg="$backgroundLight0" contentContainerStyle={{ padding: 24 }}>
      <VStack space="lg">
        <VStack space="xs">
          <Heading size="xl">Add a service record</Heading>
          <Text color="$textLight500">Logging this keeps your preventive reminders accurate.</Text>
        </VStack>

        <VStack space="xs">
          <Text size="sm" color="$textLight500" fontWeight="$semibold">
            What was serviced?
          </Text>
          <HStack flexWrap="wrap" gap="$2">
            {SERVICE_TYPES.map((type) => (
              <Chip
                key={type}
                label={type.replace(/_/g, " ")}
                icon={MAINTENANCE_ICONS[type]}
                selected={serviceType === type}
                accessibilityLabel={`Service type: ${type}`}
                onPress={() => setServiceType(type)}
              />
            ))}
          </HStack>
        </VStack>

        <Input label="Odometer reading (km)" value={odometerKm} onChangeText={setOdometerKm} placeholder="e.g. 24500" />
        <Input label="Cost (optional)" value={cost} onChangeText={setCost} placeholder="e.g. 1500" />
        <Input label="Notes (optional)" value={notes} onChangeText={setNotes} placeholder="Anything worth remembering" multiline />

        {status ? (
          <Text color="$textLight700" size="sm">
            {status}
          </Text>
        ) : null}

        <Button
          label={submitting ? "Saving…" : "Save record"}
          icon={Wrench}
          accessibilityLabel={A11Y_LABELS.saveMaintenanceRecordButton}
          disabled={submitting || !odometerKm}
          loading={submitting}
          onPress={handleSave}
        />
      </VStack>
    </ScrollView>
  );
}
