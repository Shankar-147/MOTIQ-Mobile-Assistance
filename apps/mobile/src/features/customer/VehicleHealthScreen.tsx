import React, { useCallback, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Bell, Gauge, Plus, Wrench } from "lucide-react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { MaintenanceDueStatus, MaintenanceDueStatusDto, VehicleMaintenanceRecordDto } from "@motiq/types";
import { CustomerStackParamList } from "../../navigation/types";
import { vehicleApi } from "../../api/vehicleApi";
import { A11Y_LABELS } from "../../accessibility/a11y";
import { MAINTENANCE_ICONS } from "../../theme/maintenanceIcons";
import { Badge, BadgeTone, Button, Card, LoadingScreen, ScreenHeader, SectionLabel } from "../../components/ui";
import { COLORS, FONTS } from "../../theme/colors";

type Props = NativeStackScreenProps<CustomerStackParamList, "VehicleHealth">;

const STATUS_COLOR: Record<MaintenanceDueStatus, string> = {
  [MaintenanceDueStatus.OK]: COLORS.accent,
  [MaintenanceDueStatus.DUE_SOON]: COLORS.warning,
  [MaintenanceDueStatus.OVERDUE]: COLORS.danger,
  [MaintenanceDueStatus.NOT_TRACKED]: COLORS.textSecondary,
};

const STATUS_TINT: Record<MaintenanceDueStatus, string> = {
  [MaintenanceDueStatus.OK]: COLORS.accentTint,
  [MaintenanceDueStatus.DUE_SOON]: "rgba(255, 184, 77, 0.16)",
  [MaintenanceDueStatus.OVERDUE]: "rgba(255, 77, 77, 0.16)",
  [MaintenanceDueStatus.NOT_TRACKED]: COLORS.surfaceRaised,
};

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

function titleCase(serviceType: string): string {
  return serviceType.replace(/_/g, " ").toLowerCase();
}

function SummaryCell({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <View style={{ flex: 1, gap: 2 }} accessible accessibilityLabel={`${label}: ${value}`}>
      <Text style={{ fontFamily: FONTS.display, fontSize: 28, lineHeight: 34, color }}>{value}</Text>
      <Text style={{ fontFamily: FONTS.body, fontSize: 12, color: COLORS.textSecondary }}>{label}</Text>
    </View>
  );
}

/**
 * Ch71's mobile Customer app Vehicle Health screen — a deliberately
 * rule-based preventive-maintenance dashboard (no ML/telemetry involved, see
 * maintenance-due.util.ts's doc comment and the ML roadmap's Phase 1): a
 * summary of what needs attention, a due-status row per service type, plus the
 * raw service history below.
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

  const count = (status: MaintenanceDueStatus) => dueStatus.filter((row) => row.status === status).length;
  const overdue = count(MaintenanceDueStatus.OVERDUE);
  const dueSoon = count(MaintenanceDueStatus.DUE_SOON);
  const ok = count(MaintenanceDueStatus.OK);

  const headline =
    overdue > 0
      ? { text: `${overdue} service${overdue === 1 ? "" : "s"} overdue`, color: COLORS.danger }
      : dueSoon > 0
        ? { text: `${dueSoon} coming up soon`, color: COLORS.warning }
        : ok > 0
          ? { text: "All up to date", color: COLORS.accent }
          : { text: "Nothing tracked yet", color: COLORS.text };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: COLORS.bg }} contentContainerStyle={{ padding: 24, gap: 24 }}>
      <ScreenHeader title="Vehicle health" subtitle="Preventive reminders based on your service history." />

      <Card style={{ gap: 18 }}>
        <View style={{ gap: 4 }}>
          <Text style={{ fontFamily: FONTS.display, fontSize: 20, color: headline.color }}>{headline.text}</Text>
          {ok === 0 && overdue === 0 && dueSoon === 0 ? (
            <Text style={{ fontFamily: FONTS.body, fontSize: 13, color: COLORS.textSecondary }}>
              Log a service record and we'll start tracking when each check is due.
            </Text>
          ) : null}
        </View>
        <View style={{ flexDirection: "row" }}>
          <SummaryCell label="Overdue" value={overdue} color={overdue > 0 ? COLORS.danger : COLORS.text} />
          <SummaryCell label="Due soon" value={dueSoon} color={dueSoon > 0 ? COLORS.warning : COLORS.text} />
          <SummaryCell label="Up to date" value={ok} color={COLORS.accent} />
        </View>
      </Card>

      <View style={{ gap: 12 }}>
        <Button
          label="Add a service record"
          icon={Plus}
          accessibilityLabel={A11Y_LABELS.addMaintenanceRecordButton}
          onPress={() => navigation.navigate("AddMaintenanceRecord", { vehicleId })}
        />
        <Button
          label="Reminder settings"
          variant="outline"
          icon={Bell}
          accessibilityLabel="Reminder settings"
          onPress={() => navigation.navigate("ReminderSettings")}
        />
      </View>

      <View style={{ gap: 10 }}>
        <SectionLabel>Service checks</SectionLabel>
        <Card style={{ padding: 0 }}>
          {dueStatus.map((row, index) => {
            const Icon = MAINTENANCE_ICONS[row.serviceType];
            return (
              <View
                key={row.serviceType}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 12,
                  paddingHorizontal: 16,
                  paddingVertical: 14,
                  borderBottomWidth: index === dueStatus.length - 1 ? 0 : 1,
                  borderBottomColor: COLORS.border,
                }}
              >
                <View
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 20,
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: STATUS_TINT[row.status],
                  }}
                >
                  <Icon size={18} color={STATUS_COLOR[row.status]} />
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={{ fontFamily: FONTS.bodyBold, fontSize: 15, color: COLORS.text, textTransform: "capitalize" }}>
                    {titleCase(row.serviceType)}
                  </Text>
                  <Text style={{ fontFamily: FONTS.body, fontSize: 13, color: COLORS.textSecondary }}>
                    {row.lastServicedAt
                      ? `Last done ${new Date(row.lastServicedAt).toLocaleDateString()}${
                          row.lastOdometerKm != null ? ` at ${row.lastOdometerKm.toLocaleString()} km` : ""
                        }`
                      : "No record logged yet"}
                  </Text>
                </View>
                <Badge label={STATUS_LABEL[row.status]} tone={STATUS_TONE[row.status]} />
              </View>
            );
          })}
        </Card>
      </View>

      <View style={{ gap: 10 }}>
        <SectionLabel>Service history</SectionLabel>
        {records.length === 0 ? (
          <Card style={{ alignItems: "center", gap: 10, paddingVertical: 28 }}>
            <Wrench size={26} color={COLORS.textMuted} />
            <Text style={{ fontFamily: FONTS.body, fontSize: 14, color: COLORS.textSecondary, textAlign: "center" }}>
              No service records yet. Add your first one to start tracking.
            </Text>
          </Card>
        ) : (
          <Card style={{ padding: 0 }}>
            {records.map((record, index) => (
              <View
                key={record.id}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  paddingHorizontal: 16,
                  paddingVertical: 14,
                  borderBottomWidth: index === records.length - 1 ? 0 : 1,
                  borderBottomColor: COLORS.border,
                }}
              >
                <View style={{ gap: 2, flex: 1 }}>
                  <Text style={{ fontFamily: FONTS.bodyBold, fontSize: 15, color: COLORS.text, textTransform: "capitalize" }}>
                    {titleCase(record.serviceType)}
                  </Text>
                  <Text style={{ fontFamily: FONTS.body, fontSize: 13, color: COLORS.textSecondary }}>
                    {new Date(record.servicedAt).toLocaleDateString()}
                    {record.cost ? ` · ₹${record.cost}` : ""}
                  </Text>
                </View>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <Gauge size={14} color={COLORS.textMuted} />
                  <Text style={{ fontFamily: FONTS.body, fontSize: 13, color: COLORS.textSecondary }}>
                    {record.odometerKm.toLocaleString()} km
                  </Text>
                </View>
              </View>
            ))}
          </Card>
        )}
      </View>
    </ScrollView>
  );
}
