import React, { useState } from "react";
import { Center, Heading, Text, VStack } from "@gluestack-ui/themed";
import { ShieldCheck } from "lucide-react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { UserRole } from "@motiq/types";
import { AuthStackParamList } from "../../navigation/types";
import { authApi } from "../../api/authApi";
import { useAuthStore } from "../../store/authStore";
import { Button, Input } from "../../components/ui";

type Props = NativeStackScreenProps<AuthStackParamList, "OtpVerify">;

/**
 * Handles both login (phone already has a User) and registration (new
 * phone) in one screen, matching the backend's own `POST /auth/otp/verify`
 * semantics (docs/api-conventions.md) — the server decides which happened;
 * this screen just always sends the role-specific fields, which the server
 * ignores for an existing-user login.
 */
export function OtpVerifyScreen({ route }: Props) {
  const { phone, intendedRole } = route.params;
  const setSession = useAuthStore((state) => state.setSession);

  const [code, setCode] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [serviceAreaId, setServiceAreaId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleVerify() {
    setError(null);
    setSubmitting(true);
    try {
      const response = await authApi.verifyOtp({
        phone,
        code,
        role: intendedRole,
        displayName: intendedRole === UserRole.CUSTOMER ? displayName : undefined,
        businessName: intendedRole === UserRole.PROVIDER ? businessName : undefined,
        serviceAreaId: intendedRole === UserRole.PROVIDER ? serviceAreaId : undefined,
      });
      await setSession({
        accessToken: response.data.accessToken,
        refreshToken: response.data.refreshToken,
      });
      // No explicit navigation call needed — RootNavigator switches stacks
      // as soon as useAuthStore's `user` is set.
    } catch {
      setError("That code didn't work. Check it and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <VStack flex={1} bg="$backgroundLight0" p="$6" space="md">
      <Center py="$6">
        <Center w={72} h={72} borderRadius="$full" bg="$primary50" mb="$4">
          <ShieldCheck size={32} color="#4F46E5" />
        </Center>
        <Heading size="xl">Enter your code</Heading>
        <Text color="$textLight500" textAlign="center" mt="$1">
          Sent to {phone}
        </Text>
      </Center>

      <Input label="Verification code" value={code} onChangeText={setCode} placeholder="6-digit code" />

      {intendedRole === UserRole.CUSTOMER ? (
        <Input label="Your name" value={displayName} onChangeText={setDisplayName} placeholder="New accounts only" />
      ) : (
        <>
          <Input label="Business name" value={businessName} onChangeText={setBusinessName} placeholder="New accounts only" />
          <Input
            label="Service Area ID"
            value={serviceAreaId}
            onChangeText={setServiceAreaId}
            placeholder="New accounts only"
          />
        </>
      )}

      {error ? (
        <Text color="$error600" size="sm">
          {error}
        </Text>
      ) : null}

      <Button
        label={submitting ? "Verifying…" : "Verify"}
        accessibilityLabel="Verify code"
        disabled={submitting || code.length < 6}
        loading={submitting}
        onPress={handleVerify}
      />
    </VStack>
  );
}
