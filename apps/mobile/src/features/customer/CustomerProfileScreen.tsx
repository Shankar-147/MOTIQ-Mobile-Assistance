import React, { useCallback, useState } from "react";
import { HStack, Pressable, ScrollView, Text, VStack } from "@gluestack-ui/themed";
import { useFocusEffect } from "@react-navigation/native";
import type { CompositeScreenProps } from "@react-navigation/native";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { CarFront, LogOut, Pencil, Plus, Save, Trash2 } from "lucide-react-native";
import { VehicleDto } from "@motiq/types";
import { CustomerStackParamList, CustomerTabParamList } from "../../navigation/types";
import { customerApi } from "../../api/customerApi";
import { vehicleApi } from "../../api/vehicleApi";
import { useAuthStore } from "../../store/authStore";
import { A11Y_LABELS } from "../../accessibility/a11y";
import { Button, Card, Chip, EmptyState, InitialsAvatar, Input } from "../../components/ui";

type Props = CompositeScreenProps<
  BottomTabScreenProps<CustomerTabParamList, "Profile">,
  NativeStackScreenProps<CustomerStackParamList>
>;

interface OwnProfile {
  displayName: string;
  preferredLanguage: string;
}

const LANGUAGES = ["en", "hi", "ta"];

/** Ch71's mobile Customer app Profile tab — view/edit the bootstrap-phase
 * profile fields (Ch16's multi-language support reads preferredLanguage
 * from here), manage saved vehicles, and log out. */
export function CustomerProfileScreen({ navigation }: Props) {
  const [displayName, setDisplayName] = useState("");
  const [preferredLanguage, setPreferredLanguage] = useState("");
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [vehicles, setVehicles] = useState<VehicleDto[]>([]);
  const [deletingVehicleId, setDeletingVehicleId] = useState<string | null>(null);
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
      loadVehicles();
    }, [loadVehicles]),
  );

  async function handleDeleteVehicle(vehicleId: string) {
    setDeletingVehicleId(vehicleId);
    try {
      await vehicleApi.remove(vehicleId);
      setVehicles((current) => current.filter((vehicle) => vehicle.id !== vehicleId));
    } catch {
      setStatus("Couldn't remove that vehicle — try again.");
    } finally {
      setDeletingVehicleId(null);
    }
  }

  async function handleSave() {
    setSaving(true);
    setStatus(null);
    try {
      await customerApi.updateOwnProfile({ displayName, preferredLanguage });
      setStatus("Saved.");
    } catch {
      setStatus("Couldn't save your profile — try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <ScrollView flex={1} bg="$backgroundLight0" contentContainerStyle={{ padding: 24 }}>
      <VStack space="md">
        <Card>
          <HStack alignItems="center" space="md">
            <InitialsAvatar name={displayName ? displayName.charAt(0).toUpperCase() : "?"} size="lg" />
            <Text fontWeight="$bold" size="lg" color="$textLight900">
              {displayName || "Your profile"}
            </Text>
          </HStack>
        </Card>

        <Input label="Name" value={displayName} onChangeText={setDisplayName} />

        <VStack space="xs">
          <Text size="sm" color="$textLight500">
            Preferred language
          </Text>
          <HStack space="sm">
            {LANGUAGES.map((code) => (
              <Chip
                key={code}
                label={code.toUpperCase()}
                selected={preferredLanguage === code}
                accessibilityLabel={`Preferred language: ${code}`}
                onPress={() => setPreferredLanguage(code)}
              />
            ))}
          </HStack>
        </VStack>

        {status ? <Text color="$textLight700">{status}</Text> : null}

        <Button
          label={saving ? "Saving…" : "Save"}
          icon={Save}
          accessibilityLabel={A11Y_LABELS.saveProfileButton}
          disabled={saving}
          loading={saving}
          onPress={handleSave}
        />

        <VStack space="sm">
          <Text size="sm" color="$textLight500" fontWeight="$semibold">
            My vehicles
          </Text>

          {vehicles.length === 0 ? (
            <EmptyState icon={CarFront} title="No vehicles yet" description="Add one so providers know what they're helping with." />
          ) : (
            vehicles.map((vehicle) => (
              <Card key={vehicle.id}>
                <HStack alignItems="center" justifyContent="space-between">
                  <Pressable
                    flex={1}
                    accessibilityRole="button"
                    accessibilityLabel={`${A11Y_LABELS.viewVehicleHealthButton}: ${vehicle.make} ${vehicle.model}`}
                    onPress={() => navigation.navigate("VehicleHealth", { vehicleId: vehicle.id })}
                  >
                    <VStack>
                      <Text fontWeight="$bold" color="$textLight900">
                        {vehicle.make} {vehicle.model}
                      </Text>
                      <Text size="sm" color="$textLight500">
                        {vehicle.plateNumber} · {vehicle.vehicleType.replace("_", " ")}
                        {vehicle.year ? ` · ${vehicle.year}` : ""}
                      </Text>
                    </VStack>
                  </Pressable>
                  <HStack space="xs">
                    <Button
                      label="Edit"
                      variant="outline"
                      fullWidth={false}
                      icon={Pencil}
                      accessibilityLabel={`${A11Y_LABELS.editVehicleButton}: ${vehicle.make} ${vehicle.model}`}
                      onPress={() => navigation.navigate("AddVehicle", { vehicleId: vehicle.id })}
                    />
                    <Button
                      label="Remove"
                      variant="danger"
                      fullWidth={false}
                      icon={Trash2}
                      accessibilityLabel={A11Y_LABELS.deleteVehicleButton}
                      disabled={deletingVehicleId === vehicle.id}
                      loading={deletingVehicleId === vehicle.id}
                      onPress={() => handleDeleteVehicle(vehicle.id)}
                    />
                  </HStack>
                </HStack>
              </Card>
            ))
          )}

          <Button
            label="Add a vehicle"
            variant="outline"
            icon={Plus}
            accessibilityLabel={A11Y_LABELS.addVehicleButton}
            onPress={() => navigation.navigate("AddVehicle", undefined)}
          />
        </VStack>

        <Button
          label="Log out"
          variant="danger"
          icon={LogOut}
          accessibilityLabel={A11Y_LABELS.logoutButton}
          onPress={() => logout()}
        />
      </VStack>
    </ScrollView>
  );
}
