import React, { useCallback, useState } from "react";
import { Heading, HStack, ScrollView, Text, VStack } from "@gluestack-ui/themed";
import { useFocusEffect } from "@react-navigation/native";
import { Bell } from "lucide-react-native";
import { MaintenanceServiceType, VehicleReminderSettingsDto } from "@motiq/types";
import { vehicleApi } from "../../api/vehicleApi";
import { MAINTENANCE_ICONS } from "../../theme/maintenanceIcons";
import { Button, Card, Chip, LoadingScreen, Toggle } from "../../components/ui";

const LEAD_TIME_OPTIONS = [3, 7, 14];

/** Ch71's mobile Reminder settings screen — the design mockup made real:
 * per-category push-reminder toggles plus a shared "how early" setting,
 * saved via VehicleService.updateReminderSettings(). */
export function ReminderSettingsScreen() {
  const [settings, setSettings] = useState<VehicleReminderSettingsDto | null>(null);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

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
      setStatus("Saved.");
    } catch {
      setStatus("Couldn't save your preferences — try again.");
    } finally {
      setSaving(false);
    }
  }

  if (!settings) {
    return <LoadingScreen />;
  }

  return (
    <ScrollView flex={1} bg="$backgroundLight0" contentContainerStyle={{ padding: 24 }}>
      <VStack space="lg">
        <VStack space="xs">
          <Heading size="xl">Reminder settings</Heading>
          <Text color="$textLight500">Choose which checks send you a reminder, and how early.</Text>
        </VStack>

        <VStack space="sm">
          {settings.preferences.map((preference) => {
            const Icon = MAINTENANCE_ICONS[preference.serviceType];
            return (
              <Card key={preference.serviceType}>
                <HStack alignItems="center" space="md">
                  <Icon size={18} color="#4338CA" />
                  <Text flex={1} fontWeight="$semibold" color="$textLight900" textTransform="capitalize">
                    {preference.serviceType.replace(/_/g, " ").toLowerCase()}
                  </Text>
                  <Toggle
                    value={preference.enabled}
                    onValueChange={() => toggleCategory(preference.serviceType)}
                    accessibilityLabel={`Reminders for ${preference.serviceType.replace(/_/g, " ").toLowerCase()}`}
                  />
                </HStack>
              </Card>
            );
          })}
        </VStack>

        <VStack space="xs">
          <Text size="sm" color="$textLight500" fontWeight="$semibold">
            Remind me
          </Text>
          <HStack space="sm" flexWrap="wrap" gap="$2">
            {LEAD_TIME_OPTIONS.map((days) => (
              <Chip
                key={days}
                label={`${days} day${days === 1 ? "" : "s"} before`}
                selected={settings.leadTimeDays === days}
                accessibilityLabel={`Remind me ${days} days before`}
                onPress={() => setLeadTimeDays(days)}
              />
            ))}
          </HStack>
        </VStack>

        {status ? (
          <Text color="$textLight700" size="sm">
            {status}
          </Text>
        ) : null}

        <Button
          label={saving ? "Saving…" : "Save preferences"}
          icon={Bell}
          disabled={saving}
          loading={saving}
          onPress={handleSave}
        />
      </VStack>
    </ScrollView>
  );
}
