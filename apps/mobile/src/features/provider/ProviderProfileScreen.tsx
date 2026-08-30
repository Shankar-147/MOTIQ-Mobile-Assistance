import React, { useCallback, useState } from "react";
import { Box, Heading, HStack, Pressable, ScrollView, Text, VStack } from "@gluestack-ui/themed";
import { useFocusEffect } from "@react-navigation/native";
import type { CompositeScreenProps } from "@react-navigation/native";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { FileText, IndianRupee, LogOut, Plus, Star, Trash2 } from "lucide-react-native";
import { ProviderFleetVehicleDto, ProviderVerificationStatus } from "@motiq/types";
import { ProviderStackParamList, ProviderTabParamList } from "../../navigation/types";
import { providerApi } from "../../api/providerApi";
import { providerFleetVehicleApi } from "../../api/providerFleetVehicleApi";
import { useAuthStore } from "../../store/authStore";
import { A11Y_LABELS } from "../../accessibility/a11y";
import { Badge, Button, Card, EmptyState, InitialsAvatar, LoadingScreen } from "../../components/ui";
import { verificationBadgeTone } from "./verificationBadgeTone";

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

/** Ch72's mobile Provider app Profile screen — tier, trust score, fleet-
 * vehicle management, earnings/ratings entry points, and the entry point
 * into Ch98's KYC document upload flow (previously API-only, see
 * docs/roadmap.md's Reconciliation Notes on the gap this closes). */
export function ProviderProfileScreen({ navigation }: Props) {
  const [profile, setProfile] = useState<OwnProfile | null>(null);
  const [fleetVehicles, setFleetVehicles] = useState<ProviderFleetVehicleDto[]>([]);
  const [deletingVehicleId, setDeletingVehicleId] = useState<string | null>(null);
  const [fleetStatus, setFleetStatus] = useState<string | null>(null);
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
      loadFleetVehicles();
    }, [loadFleetVehicles]),
  );

  async function handleDeleteFleetVehicle(vehicleId: string) {
    setDeletingVehicleId(vehicleId);
    try {
      await providerFleetVehicleApi.remove(vehicleId);
      setFleetVehicles((current) => current.filter((vehicle) => vehicle.id !== vehicleId));
    } catch {
      setFleetStatus("Couldn't remove that vehicle — try again.");
    } finally {
      setDeletingVehicleId(null);
    }
  }

  if (!profile) {
    return <LoadingScreen />;
  }

  return (
    <ScrollView flex={1} bg="$backgroundLight0" contentContainerStyle={{ padding: 24 }}>
      <VStack space="md">
        <Card>
          <HStack alignItems="center" space="md" mb="$3">
            <InitialsAvatar name={profile.businessName.charAt(0).toUpperCase()} size="lg" />
            <VStack flex={1}>
              <Heading size="lg">{profile.businessName}</Heading>
              <Box mt="$1">
                <Badge label={profile.verificationStatus.replace("_", " ")} tone={verificationBadgeTone(profile.verificationStatus)} />
              </Box>
            </VStack>
          </HStack>
        </Card>

        <HStack space="xl">
          <VStack alignItems="center">
            <HStack alignItems="center" space="xs">
              <Star size={16} color="#D97706" fill="#D97706" />
              <Text fontWeight="$extrabold" size="xl">
                {Number(profile.ratingAverage).toFixed(1)}
              </Text>
            </HStack>
            <Text size="xs" color="$textLight500">
              Rating
            </Text>
          </VStack>
          <VStack alignItems="center">
            <Text fontWeight="$extrabold" size="xl">
              {profile.completedJobCount}
            </Text>
            <Text size="xs" color="$textLight500">
              Jobs done
            </Text>
          </VStack>
          <VStack alignItems="center">
            <Text fontWeight="$extrabold" size="xl">
              {Number(profile.trustScore).toFixed(2)}
            </Text>
            <Text size="xs" color="$textLight500">
              Trust score
            </Text>
          </VStack>
        </HStack>

        {profile.verificationStatus === ProviderVerificationStatus.UNVERIFIED ||
        profile.verificationStatus === ProviderVerificationStatus.PROVISIONAL ? (
          <Text color="$textLight500">
            Submit your KYC documents to reach full verification and unlock more job offers.
          </Text>
        ) : null}

        <Button
          label="Verification documents"
          icon={FileText}
          onPress={() => navigation.navigate("KycUpload")}
          accessibilityLabel={A11Y_LABELS.uploadDocumentButton}
        />
        <Button
          label="Earnings"
          variant="outline"
          icon={IndianRupee}
          accessibilityLabel={A11Y_LABELS.viewEarningsButton}
          onPress={() => navigation.navigate("Earnings")}
        />
        <Button
          label="My ratings"
          variant="outline"
          icon={Star}
          accessibilityLabel={A11Y_LABELS.viewRatingsButton}
          onPress={() => navigation.navigate("MyRatings")}
        />

        <VStack space="sm">
          <Text size="sm" color="$textLight500" fontWeight="$semibold">
            My fleet
          </Text>

          {fleetVehicles.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="No fleet vehicles yet"
              description="Add one so your fleet details are on file."
            />
          ) : (
            fleetVehicles.map((vehicle) => (
              <Card key={vehicle.id}>
                <HStack alignItems="center" justifyContent="space-between">
                  <Pressable
                    flex={1}
                    accessibilityRole="button"
                    accessibilityLabel={`Edit ${vehicle.make} ${vehicle.model}`}
                    onPress={() => navigation.navigate("AddFleetVehicle", { vehicleId: vehicle.id })}
                  >
                    <VStack>
                      <Text fontWeight="$bold" color="$textLight900">
                        {vehicle.make} {vehicle.model}
                      </Text>
                      <Text size="sm" color="$textLight500">
                        {vehicle.plateNumber} · {vehicle.vehicleType.replace("_", " ")}
                      </Text>
                    </VStack>
                  </Pressable>
                  <Button
                    label="Remove"
                    variant="danger"
                    fullWidth={false}
                    icon={Trash2}
                    accessibilityLabel={A11Y_LABELS.deleteFleetVehicleButton}
                    disabled={deletingVehicleId === vehicle.id}
                    loading={deletingVehicleId === vehicle.id}
                    onPress={() => handleDeleteFleetVehicle(vehicle.id)}
                  />
                </HStack>
              </Card>
            ))
          )}

          {fleetStatus ? <Text color="$textLight700">{fleetStatus}</Text> : null}

          <Button
            label="Add a fleet vehicle"
            variant="outline"
            icon={Plus}
            accessibilityLabel={A11Y_LABELS.addFleetVehicleButton}
            onPress={() => navigation.navigate("AddFleetVehicle", undefined)}
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
