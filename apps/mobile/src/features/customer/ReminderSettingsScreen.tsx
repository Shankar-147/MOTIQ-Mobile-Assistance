import React, { useCallback, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Bell } from "lucide-react-native";
import { MaintenanceServiceType, VehicleReminderSettingsDto } from "@motiq/types";
import { vehicleApi } from "../../api/vehicleApi";
import { MAINTENANCE_ICONS } from "../../theme/maintenanceIcons";
import { Button, Card, Chip, LoadingScreen, ScreenHeader, SectionLabel, Toggle } from "../../components/ui";
import { COLORS, FONTS } from "../../theme/colors";

const LEAD_TIME_OPTIONS = [3, 7, 14];

/** Ch71's mobile Reminder settings screen — the design mockup made real:
 * per-category push-reminder toggles plus a shared "how early" setting,
 * saved via VehicleService.updateReminderSettings(). */
export function ReminderSettingsScreen() {
  const [settings, setSettings] = useState<VehicleReminderSettingsDto | null>(null);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<{ text: string; ok: boolean } | null>(null);

  useFocusEffect(
    useCallback(() => {
      vehicleApi
        .getReminderSettings()
        .then((response) => setSettings(response.data as VehicleReminderSettingsDto))
        .catch(() => undefined);
    }, []),
  );

  function toggleCategory(serviceType: MaintenanceServiceType) {
    setSettings((current) => {
      if (!current) return current;
      return {
        ...current,
        preferences: current.preferences.map((preference) =>
          preference.serviceType === serviceType ? { ...preference, enabled: !preference.enabled } : preference,
        ),
      };
    });
  }

  function setLeadTimeDays(leadTimeDays: number) {
    setSettings((current) => (current ? { ...current, leadTimeDays } : current));
  }

  async function handleSave() {
    if (!settings) return;
    setSaving(true);
    setStatus(null);
    try {
      const response = await vehicleApi.updateReminderSettings({
        preferences: settings.preferences,
        leadTimeDays: settings.leadTimeDays,
      });
      setSettings(response.data as VehicleReminderSettingsDto);
      setStatus({ text: "Saved.", ok: true });
    } catch {
      setStatus({ text: "Couldn't save your preferences — try again.", ok: false });
    } finally {
      setSaving(false);
    }
  }

  if (!settings) {
    return <LoadingScreen />;
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: COLORS.bg }} contentContainerStyle={{ padding: 24, gap: 24 }}>
      <ScreenHeader title="Reminder settings" subtitle="Choose which checks send you a reminder, and how early." />

      <View style={{ gap: 10 }}>
        <SectionLabel>Remind me</SectionLabel>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {LEAD_TIME_OPTIONS.map((days) => (
            <Chip
              key={days}
              label={`${days} days before`}
              selected={settings.leadTimeDays === days}
              accessibilityLabel={`Remind me ${days} days before`}
              onPress={() => setLeadTimeDays(days)}
            />
          ))}
        </View>
      </View>

      <View style={{ gap: 10 }}>
        <SectionLabel>Checks to remind me about</SectionLabel>
        <Card style={{ padding: 0 }}>
          {settings.preferences.map((preference, index) => {
            const Icon = MAINTENANCE_ICONS[preference.serviceType];
            const name = preference.serviceType.replace(/_/g, " ").toLowerCase();
            return (
              <View
                key={preference.serviceType}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 12,
                  paddingHorizontal: 16,
                  paddingVertical: 12,
                  borderBottomWidth: index === settings.preferences.length - 1 ? 0 : 1,
                  borderBottomColor: COLORS.border,
                }}
              >
                <Icon size={18} color={preference.enabled ? COLORS.accent : COLORS.textMuted} />
                <Text style={{ flex: 1, fontFamily: FONTS.bodyBold, fontSize: 15, color: COLORS.text, textTransform: "capitalize" }}>
                  {name}
                </Text>
                <Toggle
                  value={preference.enabled}
                  onValueChange={() => toggleCategory(preference.serviceType)}
                  accessibilityLabel={`Reminders for ${name}`}
                />
              </View>
            );
          })}
        </Card>
      </View>

      {status ? (
        <Text style={{ fontFamily: FONTS.body, fontSize: 14, color: status.ok ? COLORS.accent : COLORS.warning }}>{status.text}</Text>
      ) : null}

      <Button label={saving ? "Saving…" : "Save preferences"} icon={Bell} disabled={saving} loading={saving} onPress={handleSave} />
    </ScrollView>
  );
}
