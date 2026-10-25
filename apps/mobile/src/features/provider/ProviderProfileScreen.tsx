import React, { useCallback, useState } from "react";
import { Alert, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import type { CompositeScreenProps } from "@react-navigation/native";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { CarFront, Ellipsis, FileCheck2, FileClock, FileText, FileWarning, IndianRupee, LogOut, Pencil, Plus, Star, Trash2 } from "lucide-react-native";
import {
  ProviderFleetVehicleDto,
  ProviderVerificationStatus,
  VerificationDocumentStatus,
  VerificationDocumentType,
} from "@motiq/types";
import { ProviderStackParamList, ProviderTabParamList } from "../../navigation/types";
import { providerApi } from "../../api/providerApi";
import { providerFleetVehicleApi } from "../../api/providerFleetVehicleApi";
import { useAuthStore } from "../../store/authStore";
import { A11Y_LABELS } from "../../accessibility/a11y";
import { Badge, LoadingScreen, SheetModal } from "../../components/ui";
import { SettingsGroup, SettingsRow } from "../../components/SettingsRow";
import { verificationBadgeTone } from "./verificationBadgeTone";
import { COLORS, FONTS } from "../../theme/colors";

type Props = CompositeScreenProps<
  BottomTabScreenProps<ProviderTabParamList, "Profile">,
  NativeStackScreenProps<ProviderStackParamList>
>;

interface OwnProfile {
  businessName: string;
  verificationStatus: ProviderVerificationStatus;
  ratingAverage: string;
  completedJobCount: number;
  trustScore: string;
  serviceAreaId: string;
}

interface DocumentRow {
  id: string;
  documentType: VerificationDocumentType;
  status: VerificationDocumentStatus;
  submittedAt: string;
}

const DOCUMENT_TYPES = Object.values(VerificationDocumentType);

function titleCase(value: string): string {
  return value
    .toLowerCase()
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function StatTile({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <View style={{ flex: 1, backgroundColor: COLORS.surface, borderRadius: 18, borderWidth: 1, borderColor: COLORS.border, padding: 14, gap: 2 }}>
      <Text style={{ fontFamily: FONTS.body, fontSize: 12, color: COLORS.textSecondary }}>{label}</Text>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
        {icon}
        <Text numberOfLines={1} adjustsFontSizeToFit style={{ fontFamily: FONTS.display, fontSize: 22, color: COLORS.text }}>
          {value}
        </Text>
      </View>
    </View>
  );
}

/** Ch72's mobile Provider app Profile screen — verification tier and trust
 * first (hero, stats, a KYC checklist that opens Ch98's document upload),
 * then settings rows, the fleet and log out. */
export function ProviderProfileScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const [profile, setProfile] = useState<OwnProfile | null>(null);
  const [documents, setDocuments] = useState<DocumentRow[]>([]);
  const [fleetVehicles, setFleetVehicles] = useState<ProviderFleetVehicleDto[]>([]);
  const [fleetStatus, setFleetStatus] = useState<string | null>(null);
  const [menuVehicle, setMenuVehicle] = useState<ProviderFleetVehicleDto | null>(null);
  const logout = useAuthStore((state) => state.logout);

  const loadFleetVehicles = useCallback(() => {
    providerFleetVehicleApi
      .listMine()
      .then((response) => setFleetVehicles((response.data as { data: ProviderFleetVehicleDto[] }).data))
      .catch(() => undefined);
  }, []);

  useFocusEffect(
    useCallback(() => {
      providerApi
        .getOwnProfile()
        .then((response) => setProfile(response.data as OwnProfile))
        .catch(() => undefined);
      providerApi
        .listVerificationDocuments()
        .then((response) => setDocuments(response.data as DocumentRow[]))
        .catch(() => undefined);
      loadFleetVehicles();
    }, [loadFleetVehicles]),
  );

  function confirmDeleteVehicle(vehicle: ProviderFleetVehicleDto) {
    setMenuVehicle(null);
    Alert.alert("Remove vehicle?", `${vehicle.make} ${vehicle.model} (${vehicle.plateNumber}) will be removed from your fleet.`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: async () => {
          try {
            await providerFleetVehicleApi.remove(vehicle.id);
            setFleetVehicles((current) => current.filter((v) => v.id !== vehicle.id));
          } catch {
            setFleetStatus("Couldn't remove that vehicle — try again.");
          }
        },
      },
    ]);
  }

  if (!profile) {
    return <LoadingScreen />;
  }

  /** The most recent submission per document type decides its checklist state. */
  function documentState(type: VerificationDocumentType): { label: string; icon: typeof FileText } {
    const latest = documents
      .filter((d) => d.documentType === type)
      .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime())[0];
    if (!latest) return { label: "Not submitted", icon: FileText };
    if (latest.status === VerificationDocumentStatus.APPROVED) return { label: "Approved", icon: FileCheck2 };
    if (latest.status === VerificationDocumentStatus.REJECTED) return { label: "Rejected", icon: FileWarning };
    return { label: "In review", icon: FileClock };
  }

  const needsKyc =
    profile.verificationStatus === ProviderVerificationStatus.UNVERIFIED ||
    profile.verificationStatus === ProviderVerificationStatus.PROVISIONAL;

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
              {profile.businessName.charAt(0).toUpperCase()}
            </Text>
          </View>
          <Text style={{ fontFamily: FONTS.display, fontSize: 24, color: COLORS.text, textAlign: "center" }}>{profile.businessName}</Text>
          <Badge label={profile.verificationStatus.replace("_", " ").toLowerCase()} tone={verificationBadgeTone(profile.verificationStatus)} />
        </View>

        <View style={{ flexDirection: "row", gap: 10 }}>
          <StatTile
            label="Rating"
            value={Number(profile.ratingAverage).toFixed(1)}
            icon={<Star size={16} color={COLORS.warning} fill={COLORS.warning} />}
          />
          <StatTile label="Jobs done" value={String(profile.completedJobCount)} />
          <StatTile label="Trust score" value={Number(profile.trustScore).toFixed(2)} />
        </View>

        <View style={{ gap: 8 }}>
          <SettingsGroup title="Verification">
            {DOCUMENT_TYPES.map((type, index) => {
              const state = documentState(type);
              return (
                <SettingsRow
                  key={type}
                  icon={state.icon}
                  label={titleCase(type)}
                  value={state.label}
                  last={index === DOCUMENT_TYPES.length - 1}
                  accessibilityLabel={`${A11Y_LABELS.uploadDocumentButton}: ${titleCase(type)}, ${state.label}`}
                  onPress={() => navigation.navigate("KycUpload")}
                />
              );
            })}
          </SettingsGroup>
          {needsKyc ? (
            <Text style={{ fontFamily: FONTS.body, fontSize: 13, color: COLORS.textSecondary, paddingHorizontal: 4 }}>
              Submit your KYC documents to reach full verification and unlock more job offers.
            </Text>
          ) : null}
        </View>

        <SettingsGroup title="Your business">
          <SettingsRow icon={IndianRupee} label="Earnings" accessibilityLabel={A11Y_LABELS.viewEarningsButton} onPress={() => navigation.navigate("Earnings")} />
          <SettingsRow icon={Star} label="My ratings" accessibilityLabel={A11Y_LABELS.viewRatingsButton} onPress={() => navigation.navigate("MyRatings")} last />
        </SettingsGroup>

        <View style={{ gap: 8 }}>
          <Text style={{ fontFamily: FONTS.bodyBold, fontSize: 12.5, letterSpacing: 0.6, color: COLORS.textSecondary, textTransform: "uppercase", paddingHorizontal: 4 }}>
            My fleet
          </Text>
          {fleetVehicles.map((vehicle) => (
            <Pressable
              key={vehicle.id}
              accessibilityRole="button"
              accessibilityLabel={`Edit ${vehicle.make} ${vehicle.model}`}
              onPress={() => navigation.navigate("AddFleetVehicle", { vehicleId: vehicle.id })}
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
                </Text>
                <View style={{ alignSelf: "flex-start", borderWidth: 1.5, borderColor: COLORS.textMuted, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2 }}>
                  <Text style={{ fontFamily: FONTS.bodyBold, fontSize: 12.5, letterSpacing: 1, color: COLORS.text }}>{vehicle.plateNumber}</Text>
                </View>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`More options for ${vehicle.make} ${vehicle.model}`}
                hitSlop={8}
                onPress={() => setMenuVehicle(vehicle)}
                style={{ width: 44, height: 44, alignItems: "center", justifyContent: "center" }}
              >
                <Ellipsis size={20} color={COLORS.textSecondary} />
              </Pressable>
            </Pressable>
          ))}
          {fleetStatus ? <Text style={{ fontFamily: FONTS.body, color: COLORS.warning }}>{fleetStatus}</Text> : null}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={A11Y_LABELS.addFleetVehicleButton}
            onPress={() => navigation.navigate("AddFleetVehicle", undefined)}
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
            <Text style={{ fontFamily: FONTS.bodyBold, fontSize: 15, color: COLORS.accent }}>Add a fleet vehicle</Text>
          </Pressable>
        </View>

        <SettingsGroup>
          <SettingsRow icon={LogOut} label="Log out" danger last accessibilityLabel={A11Y_LABELS.logoutButton} onPress={() => logout()} />
        </SettingsGroup>
      </ScrollView>

      <SheetModal visible={menuVehicle !== null} onClose={() => setMenuVehicle(null)} height={260}>
        {menuVehicle ? (
          <View style={{ gap: 12 }}>
            <Text style={{ fontFamily: FONTS.display, fontSize: 22, color: COLORS.text }}>
              {menuVehicle.make} {menuVehicle.model}
            </Text>
            <SettingsGroup>
              <SettingsRow
                icon={Pencil}
                label="Edit vehicle"
                onPress={() => {
                  const id = menuVehicle.id;
                  setMenuVehicle(null);
                  navigation.navigate("AddFleetVehicle", { vehicleId: id });
                }}
              />
              <SettingsRow
                icon={Trash2}
                label="Remove vehicle"
                danger
                last
                accessibilityLabel={A11Y_LABELS.deleteFleetVehicleButton}
                onPress={() => confirmDeleteVehicle(menuVehicle)}
              />
            </SettingsGroup>
          </View>
        ) : null}
      </SheetModal>
    </View>
  );
}
