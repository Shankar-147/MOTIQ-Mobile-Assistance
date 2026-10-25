import React, { useCallback, useState } from "react";
import { Alert, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import type { CompositeScreenProps } from "@react-navigation/native";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Bell, CarFront, Ellipsis, Globe, LogOut, Pencil, Plus, Save, Trash2, User } from "lucide-react-native";
import { VehicleDto } from "@motiq/types";
import { CustomerStackParamList, CustomerTabParamList } from "../../navigation/types";
import { customerApi } from "../../api/customerApi";
import { vehicleApi } from "../../api/vehicleApi";
import { requestApi } from "../../api/requestApi";
import { useAuthStore } from "../../store/authStore";
import { A11Y_LABELS } from "../../accessibility/a11y";
import { Button, Chip, Input, SheetModal } from "../../components/ui";
import { SettingsGroup, SettingsRow } from "../../components/SettingsRow";
import { COLORS, FONTS } from "../../theme/colors";

type Props = CompositeScreenProps<
  BottomTabScreenProps<CustomerTabParamList, "Profile">,
  NativeStackScreenProps<CustomerStackParamList>
>;

interface OwnProfile {
  displayName: string;
  preferredLanguage: string;
}

const LANGUAGES: { code: string; label: string }[] = [
  { code: "en", label: "English" },
  { code: "hi", label: "हिन्दी" },
  { code: "ta", label: "தமிழ்" },
];

type ActiveSheet = null | "name" | "language" | { vehicle: VehicleDto };

function languageLabel(code: string): string {
  return LANGUAGES.find((l) => l.code === code)?.label ?? code.toUpperCase();
}

/** Ch71's mobile Customer app Profile tab — a hero header, settings rows
 * (name and language edit in a sheet; Ch16 reads preferredLanguage from
 * here), saved vehicles as plate cards, and log out. */
export function CustomerProfileScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const [displayName, setDisplayName] = useState("");
  const [preferredLanguage, setPreferredLanguage] = useState("");
  const [draftName, setDraftName] = useState("");
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [vehicles, setVehicles] = useState<VehicleDto[]>([]);
  const [requestCount, setRequestCount] = useState<string | null>(null);
  const [sheet, setSheet] = useState<ActiveSheet>(null);
  const logout = useAuthStore((state) => state.logout);

  const loadVehicles = useCallback(() => {
    vehicleApi
      .listMine()
      .then((response) => setVehicles((response.data as { data: VehicleDto[] }).data))
      .catch(() => undefined);
  }, []);

  useFocusEffect(
    useCallback(() => {
      customerApi
        .getOwnProfile()
        .then((response) => {
          const profile = response.data as OwnProfile;
          setDisplayName(profile.displayName);
          setPreferredLanguage(profile.preferredLanguage);
        })
        .catch(() => undefined);
      requestApi
        .listMine({ limit: 50 })
        .then((response) => {
          const body = response.data as { data: unknown[]; pagination: { nextCursor: string | null } };
          setRequestCount(`${body.data.length}${body.pagination.nextCursor ? "+" : ""}`);
        })
        .catch(() => undefined);
      loadVehicles();
    }, [loadVehicles]),
  );

  async function saveProfile(next: OwnProfile) {
    setSaving(true);
    setStatus(null);
    try {
      await customerApi.updateOwnProfile(next);
      setDisplayName(next.displayName);
      setPreferredLanguage(next.preferredLanguage);
      setSheet(null);
    } catch {
      setStatus("Couldn't save your profile — try again.");
    } finally {
      setSaving(false);
    }
  }

  function confirmDeleteVehicle(vehicle: VehicleDto) {
    setSheet(null);
    Alert.alert("Remove vehicle?", `${vehicle.make} ${vehicle.model} (${vehicle.plateNumber}) will be removed from your profile.`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: async () => {
          try {
            await vehicleApi.remove(vehicle.id);
            setVehicles((current) => current.filter((v) => v.id !== vehicle.id));
          } catch {
            setStatus("Couldn't remove that vehicle — try again.");
          }
        },
      },
    ]);
  }

  const subtitle = [
    requestCount !== null ? `${requestCount} ${requestCount === "1" ? "request" : "requests"}` : null,
    `${vehicles.length} ${vehicles.length === 1 ? "vehicle" : "vehicles"}`,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 16, paddingHorizontal: 20, paddingBottom: 32, gap: 22 }}>
        <View style={{ alignItems: "center", gap: 10, paddingVertical: 8 }}>
          <View
            style={{
              width: 96,
              height: 96,
              borderRadius: 48,
              backgroundColor: COLORS.accent,
              alignItems: "center",
              justifyContent: "center",
              borderWidth: 4,
              borderColor: COLORS.accentTint,
            }}
          >
            <Text style={{ fontFamily: FONTS.display, fontSize: 40, color: COLORS.accentInk }}>
              {displayName ? displayName.charAt(0).toUpperCase() : "?"}
            </Text>
          </View>
          <Text style={{ fontFamily: FONTS.display, fontSize: 24, color: COLORS.text, textAlign: "center" }}>
            {displayName || "Your profile"}
          </Text>
          <Text style={{ fontFamily: FONTS.body, fontSize: 14, color: COLORS.textSecondary }}>{subtitle}</Text>
        </View>

        {status ? (
          <Text style={{ fontFamily: FONTS.body, color: COLORS.warning, textAlign: "center" }}>{status}</Text>
        ) : null}

        <SettingsGroup title="Account">
          <SettingsRow
            icon={User}
            label="Name"
            value={displayName}
            onPress={() => {
              setDraftName(displayName);
              setStatus(null);
              setSheet("name");
            }}
          />
          <SettingsRow icon={Globe} label="Language" value={languageLabel(preferredLanguage)} onPress={() => setSheet("language")} />
          <SettingsRow icon={Bell} label="Reminder settings" onPress={() => navigation.navigate("ReminderSettings")} last />
        </SettingsGroup>

        <View style={{ gap: 8 }}>
          <Text style={{ fontFamily: FONTS.bodyBold, fontSize: 12.5, letterSpacing: 0.6, color: COLORS.textSecondary, textTransform: "uppercase", paddingHorizontal: 4 }}>
            My vehicles
          </Text>
          {vehicles.map((vehicle) => (
            <Pressable
              key={vehicle.id}
              accessibilityRole="button"
              accessibilityLabel={`${A11Y_LABELS.viewVehicleHealthButton}: ${vehicle.make} ${vehicle.model}`}
              onPress={() => navigation.navigate("VehicleHealth", { vehicleId: vehicle.id })}
              style={({ pressed }) => ({
                flexDirection: "row",
                alignItems: "center",
                gap: 14,
                padding: 14,
                borderRadius: 22,
                borderWidth: 1,
                borderColor: COLORS.border,
                backgroundColor: COLORS.surface,
                opacity: pressed ? 0.85 : 1,
              })}
            >
              <View style={{ width: 48, height: 48, borderRadius: 16, backgroundColor: COLORS.surfaceRaised, alignItems: "center", justifyContent: "center" }}>
                <CarFront size={22} color={COLORS.accent} />
              </View>
              <View style={{ flex: 1, gap: 6 }}>
                <Text numberOfLines={1} style={{ fontFamily: FONTS.display, fontSize: 16, color: COLORS.text }}>
                  {vehicle.make} {vehicle.model}
                  {vehicle.year ? ` · ${vehicle.year}` : ""}
                </Text>
                <View style={{ alignSelf: "flex-start", borderWidth: 1.5, borderColor: COLORS.textMuted, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2 }}>
                  <Text style={{ fontFamily: FONTS.bodyBold, fontSize: 12.5, letterSpacing: 1, color: COLORS.text }}>{vehicle.plateNumber}</Text>
                </View>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`More options for ${vehicle.make} ${vehicle.model}`}
                hitSlop={8}
                onPress={() => setSheet({ vehicle })}
                style={{ width: 44, height: 44, alignItems: "center", justifyContent: "center" }}
              >
                <Ellipsis size={20} color={COLORS.textSecondary} />
              </Pressable>
            </Pressable>
          ))}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={A11Y_LABELS.addVehicleButton}
            onPress={() => navigation.navigate("AddVehicle", undefined)}
            style={({ pressed }) => ({
              minHeight: 64,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              borderRadius: 22,
              borderWidth: 1.5,
              borderStyle: "dashed",
              borderColor: COLORS.border,
              opacity: pressed ? 0.8 : 1,
            })}
          >
            <Plus size={18} color={COLORS.accent} />
            <Text style={{ fontFamily: FONTS.bodyBold, fontSize: 15, color: COLORS.accent }}>Add a vehicle</Text>
          </Pressable>
        </View>

        <SettingsGroup>
          <SettingsRow icon={LogOut} label="Log out" danger last accessibilityLabel={A11Y_LABELS.logoutButton} onPress={() => logout()} />
        </SettingsGroup>
      </ScrollView>

      <SheetModal visible={sheet === "name"} onClose={() => setSheet(null)} height={300}>
        <View style={{ gap: 16 }}>
          <Text style={{ fontFamily: FONTS.display, fontSize: 22, color: COLORS.text }}>Your name</Text>
          <Input label="Name" value={draftName} onChangeText={setDraftName} />
          {status ? <Text style={{ fontFamily: FONTS.body, color: COLORS.warning }}>{status}</Text> : null}
          <Button
            label={saving ? "Saving…" : "Save"}
            icon={Save}
            accessibilityLabel={A11Y_LABELS.saveProfileButton}
            disabled={saving || !draftName.trim()}
            loading={saving}
            onPress={() => saveProfile({ displayName: draftName.trim(), preferredLanguage })}
          />
        </View>
      </SheetModal>

      <SheetModal visible={sheet === "language"} onClose={() => setSheet(null)} height={260}>
        <View style={{ gap: 16 }}>
          <Text style={{ fontFamily: FONTS.display, fontSize: 22, color: COLORS.text }}>Preferred language</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {LANGUAGES.map((language) => (
              <Chip
                key={language.code}
                label={language.label}
                selected={preferredLanguage === language.code}
                accessibilityLabel={`Preferred language: ${language.code}`}
                onPress={() => saveProfile({ displayName, preferredLanguage: language.code })}
              />
            ))}
          </View>
          {status ? <Text style={{ fontFamily: FONTS.body, color: COLORS.warning }}>{status}</Text> : null}
        </View>
      </SheetModal>

      <SheetModal visible={typeof sheet === "object" && sheet !== null} onClose={() => setSheet(null)} height={260}>
        {typeof sheet === "object" && sheet !== null ? (
          <View style={{ gap: 12 }}>
            <Text style={{ fontFamily: FONTS.display, fontSize: 22, color: COLORS.text }}>
              {sheet.vehicle.make} {sheet.vehicle.model}
            </Text>
            <SettingsGroup>
              <SettingsRow
                icon={Pencil}
                label="Edit vehicle"
                accessibilityLabel={`${A11Y_LABELS.editVehicleButton}: ${sheet.vehicle.make} ${sheet.vehicle.model}`}
                onPress={() => {
                  const id = sheet.vehicle.id;
                  setSheet(null);
                  navigation.navigate("AddVehicle", { vehicleId: id });
                }}
              />
              <SettingsRow
                icon={Trash2}
                label="Remove vehicle"
                danger
                last
                accessibilityLabel={A11Y_LABELS.deleteVehicleButton}
                onPress={() => confirmDeleteVehicle(sheet.vehicle)}
              />
            </SettingsGroup>
          </View>
        ) : null}
      </SheetModal>
    </View>
  );
}
