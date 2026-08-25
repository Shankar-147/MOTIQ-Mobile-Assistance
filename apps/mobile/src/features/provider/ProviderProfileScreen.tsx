import React, { useCallback, useState } from "react";
import { Box, Heading, HStack, ScrollView, Text, VStack } from "@gluestack-ui/themed";
import { useFocusEffect } from "@react-navigation/native";
import type { CompositeScreenProps } from "@react-navigation/native";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { FileText, LogOut, Star } from "lucide-react-native";
import { ProviderVerificationStatus } from "@motiq/types";
import { ProviderStackParamList, ProviderTabParamList } from "../../navigation/types";
import { providerApi } from "../../api/providerApi";
import { useAuthStore } from "../../store/authStore";
import { A11Y_LABELS } from "../../accessibility/a11y";
import { Badge, Button, Card, InitialsAvatar, LoadingScreen } from "../../components/ui";
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

/** Ch72's mobile Provider app Profile screen — tier, trust score, and the
 * entry point into Ch98's KYC document upload flow (previously API-only,
 * see docs/roadmap.md's Reconciliation Notes on the gap this closes). */
export function ProviderProfileScreen({ navigation }: Props) {
  const [profile, setProfile] = useState<OwnProfile | null>(null);
  const logout = useAuthStore((state) => state.logout);

  useFocusEffect(
    useCallback(() => {
      providerApi
        .getOwnProfile()
        .then((response) => setProfile(response.data as OwnProfile))
        .catch(() => undefined);
    }, []),
  );

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
