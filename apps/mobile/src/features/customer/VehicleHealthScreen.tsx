import React, { useCallback, useState } from "react";
import { Center, Heading, HStack, ScrollView, Text, VStack } from "@gluestack-ui/themed";
import { useFocusEffect } from "@react-navigation/native";
import { Bell, Gauge, Plus, Wrench } from "lucide-react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { MaintenanceDueStatus, MaintenanceDueStatusDto, VehicleMaintenanceRecordDto } from "@motiq/types";
import { CustomerStackParamList } from "../../navigation/types";
import { vehicleApi } from "../../api/vehicleApi";
import { A11Y_LABELS } from "../../accessibility/a11y";
import { MAINTENANCE_ICONS } from "../../theme/maintenanceIcons";
import { Badge, BadgeTone, Button, Card, LoadingScreen } from "../../components/ui";

const STATUS_ICON_BG: Record<MaintenanceDueStatus, string> = {
  [MaintenanceDueStatus.OK]: "$success100",
  [MaintenanceDueStatus.DUE_SOON]: "$warning100",
  [MaintenanceDueStatus.OVERDUE]: "$error100",
  [MaintenanceDueStatus.NOT_TRACKED]: "$backgroundLight100",
};

const STATUS_ICON_COLOR: Record<MaintenanceDueStatus, string> = {
  [MaintenanceDueStatus.OK]: "#16A34A",
  [MaintenanceDueStatus.DUE_SOON]: "#D97706",
  [MaintenanceDueStatus.OVERDUE]: "#DC2626",
  [MaintenanceDueStatus.NOT_TRACKED]: "#64748B",
};

type Props = NativeStackScreenProps<CustomerStackParamList, "VehicleHealth">;

const STATUS_TONE: Record<MaintenanceDueStatus, BadgeTone> = {
  [MaintenanceDueStatus.OK]: "success",
  [MaintenanceDueStatus.DUE_SOON]: "warning",
  [MaintenanceDueStatus.OVERDUE]: "danger",
  [MaintenanceDueStatus.NOT_TRACKED]: "neutral",
};

const STATUS_LABEL: Record<MaintenanceDueStatus, string> = {
  [MaintenanceDueStatus.OK]: "OK",
  [MaintenanceDueStatus.DUE_SOON]: "Due soon",
  [MaintenanceDueStatus.OVERDUE]: "Overdue",
  [MaintenanceDueStatus.NOT_TRACKED]: "Not tracked",
};

/**
 * Ch71's mobile Customer app Vehicle Health screen — a deliberately
 * rule-based preventive-maintenance dashboard (no ML/telemetry involved, see
 * maintenance-due.util.ts's doc comment and the ML roadmap's Phase 1): a
 * due-status card per service type, plus the raw service history below.
 */
export function VehicleHealthScreen({ route, navigation }: Props) {
  const { vehicleId } = route.params;
  const [dueStatus, setDueStatus] = useState<MaintenanceDueStatusDto[] | null>(null);
  const [records, setRecords] = useState<VehicleMaintenanceRecordDto[]>([]);

  const load = useCallback(() => {
    vehicleApi
      .getMaintenanceDue(vehicleId)
      .then((response) => setDueStatus(response.data as MaintenanceDueStatusDto[]))
      .catch(() => undefined);
    vehicleApi
      .listMaintenanceRecords(vehicleId)
      .then((response) => setRecords(response.data as VehicleMaintenanceRecordDto[]))
      .catch(() => undefined);
  }, [vehicleId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  if (!dueStatus) {
    return <LoadingScreen />;
  }

  return (
    <ScrollView flex={1} bg="$backgroundLight0" contentContainerStyle={{ padding: 24 }}>
      <VStack space="lg">
        <HStack alignItems="flex-start" justifyContent="space-between">
          <VStack space="xs" flex={1}>
            <Heading size="xl">Vehicle health</Heading>
            <Text color="$textLight500">Preventive reminders based on your service history.</Text>
          </VStack>
          <Button
            label="Reminders"
            variant="outline"
            fullWidth={false}
            icon={Bell}
            accessibilityLabel="Reminder settings"
            onPress={() => navigation.navigate("ReminderSettings")}
          />
        </HStack>

        <VStack space="sm">
          {dueStatus.map((row) => {
            const Icon = MAINTENANCE_ICONS[row.serviceType];
            return (
              <Card key={row.serviceType}>
                <HStack alignItems="center" justifyContent="space-between" mb="$1">
                  <HStack alignItems="center" space="sm" flex={1}>
                    <Center w={36} h={36} borderRadius="$full" bg={STATUS_ICON_BG[row.status]}>
                      <Icon size={18} color={STATUS_ICON_COLOR[row.status]} />
                    </Center>
                    <Text fontWeight="$bold" color="$textLight900" textTransform="capitalize">
                      {row.serviceType.replace(/_/g, " ").toLowerCase()}
                    </Text>
                  </HStack>
                  <Badge label={STATUS_LABEL[row.status]} tone={STATUS_TONE[row.status]} />
                </HStack>
                {row.lastServicedAt ? (
                  <Text size="sm" color="$textLight500" ml="$12">
                    Last done {new Date(row.lastServicedAt).toLocaleDateString()}
                    {row.lastOdometerKm != null ? ` at ${row.lastOdometerKm.toLocaleString()} km` : ""}
                  </Text>
                ) : (
                  <Text size="sm" color="$textLight500" ml="$12">
                    No record logged yet
                  </Text>
                )}
              </Card>
            );
          })}
        </VStack>

        <Button
          label="Add a service record"
          icon={Plus}
          accessibilityLabel={A11Y_LABELS.addMaintenanceRecordButton}
          onPress={() => navigation.navigate("AddMaintenanceRecord", { vehicleId })}
        />

        <VStack space="sm">
          <Text size="sm" color="$textLight500" fontWeight="$semibold">
            Service history
          </Text>

          {records.length === 0 ? (
            <Center py="$8">
              <Wrench size={28} color="#94A3B8" />
              <Text color="$textLight500" textAlign="center" mt="$2">
                No service records yet.
              </Text>
            </Center>
          ) : (
            <Card p="$0">
              {records.map((record, index) => (
                <HStack
                  key={record.id}
                  px="$4"
                  py="$3"
                  justifyContent="space-between"
                  alignItems="center"
                  borderBottomWidth={index === records.length - 1 ? 0 : 1}
                  borderBottomColor="$borderLight200"
                >
                  <VStack>
                    <Text fontWeight="$semibold" textTransform="capitalize">
                      {record.serviceType.replace(/_/g, " ").toLowerCase()}
                    </Text>
                    <Text size="sm" color="$textLight500">
                      {new Date(record.servicedAt).toLocaleDateString()}
                      {record.cost ? ` · ₹${record.cost}` : ""}
                    </Text>
                  </VStack>
                  <HStack alignItems="center" space="xs">
                    <Gauge size={14} color="#64748B" />
                    <Text size="sm" color="$textLight500">
                      {record.odometerKm.toLocaleString()} km
                    </Text>
                  </HStack>
                </HStack>
              ))}
            </Card>
          )}
        </VStack>
      </VStack>
    </ScrollView>
  );
}
