import React, { useState } from "react";
import { Text, View } from "react-native";
import { KeyboardScreen } from "../../components/KeyboardScreen";
import { Wrench } from "lucide-react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { MaintenanceServiceType } from "@motiq/types";
import { CustomerStackParamList } from "../../navigation/types";
import { vehicleApi } from "../../api/vehicleApi";
import { A11Y_LABELS } from "../../accessibility/a11y";
import { MAINTENANCE_ICONS } from "../../theme/maintenanceIcons";
import { Button, Card, Chip, Input, ScreenHeader, SectionLabel } from "../../components/ui";
import { COLORS, FONTS } from "../../theme/colors";
import { enumLabel } from "../../utils/enumLabel";

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
    <KeyboardScreen contentContainerStyle={{ gap: 24 }}>
      <ScreenHeader title="Add a service record" subtitle="Logging this keeps your preventive reminders accurate." />

      <View style={{ gap: 10 }}>
        <SectionLabel>What was serviced?</SectionLabel>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {SERVICE_TYPES.map((type) => (
            <Chip
              key={type}
              label={enumLabel(type)}
              icon={MAINTENANCE_ICONS[type]}
              selected={serviceType === type}
              accessibilityLabel={`Service type: ${type}`}
              onPress={() => setServiceType(type)}
            />
          ))}
        </View>
      </View>

      <Card style={{ gap: 16 }}>
        <Input
          label="Odometer reading (km)"
          value={odometerKm}
          onChangeText={setOdometerKm}
          placeholder="e.g. 24500"
          keyboardType="number-pad"
        />
        <Input label="Cost (optional)" value={cost} onChangeText={setCost} placeholder="e.g. 1500" keyboardType="decimal-pad" />
        <Input label="Notes (optional)" value={notes} onChangeText={setNotes} placeholder="Anything worth remembering" multiline />
      </Card>

      {status ? <Text style={{ fontFamily: FONTS.body, fontSize: 14, color: COLORS.warning }}>{status}</Text> : null}

      <Button
        label={submitting ? "Saving…" : "Save record"}
        icon={Wrench}
        accessibilityLabel={A11Y_LABELS.saveMaintenanceRecordButton}
        disabled={submitting || !odometerKm}
        loading={submitting}
        onPress={handleSave}
      />
    </KeyboardScreen>
  );
}
