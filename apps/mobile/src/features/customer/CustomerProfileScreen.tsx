import React, { useCallback, useState } from "react";
import { HStack, ScrollView, Text, VStack } from "@gluestack-ui/themed";
import { useFocusEffect } from "@react-navigation/native";
import { LogOut, Save } from "lucide-react-native";
import { customerApi } from "../../api/customerApi";
import { useAuthStore } from "../../store/authStore";
import { A11Y_LABELS } from "../../accessibility/a11y";
import { Button, Card, Chip, InitialsAvatar, Input } from "../../components/ui";

interface OwnProfile {
  displayName: string;
  preferredLanguage: string;
}

const LANGUAGES = ["en", "hi", "ta"];

/** Ch71's mobile Customer app Profile tab — view/edit the bootstrap-phase
 * profile fields (Ch16's multi-language support reads preferredLanguage
 * from here) and log out. */
export function CustomerProfileScreen() {
  const [displayName, setDisplayName] = useState("");
  const [preferredLanguage, setPreferredLanguage] = useState("");
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const logout = useAuthStore((state) => state.logout);

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
    }, []),
  );

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
