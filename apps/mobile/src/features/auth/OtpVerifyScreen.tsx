import React, { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { UserRole } from "@motiq/types";
import { AuthStackParamList } from "../../navigation/types";
import { authApi } from "../../api/authApi";
import { useAuthStore } from "../../store/authStore";
import { MIN_TOUCH_TARGET_SIZE } from "../../accessibility/a11y";

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
    <View style={styles.container}>
      <Text style={styles.label}>Code sent to {phone}</Text>
      <TextInput
        style={styles.input}
        keyboardType="number-pad"
        placeholder="6-digit code"
        value={code}
        onChangeText={setCode}
        accessibilityLabel="Verification code"
      />

      {intendedRole === UserRole.CUSTOMER ? (
        <TextInput
          style={styles.input}
          placeholder="Your name (new accounts only)"
          value={displayName}
          onChangeText={setDisplayName}
          accessibilityLabel="Display name"
        />
      ) : (
        <>
          <TextInput
            style={styles.input}
            placeholder="Business name (new accounts only)"
            value={businessName}
            onChangeText={setBusinessName}
            accessibilityLabel="Business name"
          />
          <TextInput
            style={styles.input}
            placeholder="Service Area ID (new accounts only)"
            value={serviceAreaId}
            onChangeText={setServiceAreaId}
            accessibilityLabel="Service area ID"
          />
        </>
      )}

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Verify code"
        style={styles.button}
        disabled={submitting || code.length < 6}
        onPress={handleVerify}
      >
        <Text style={styles.buttonText}>{submitting ? "Verifying…" : "Verify"}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, gap: 12 },
  label: { fontSize: 14, color: "#555" },
  input: {
    minHeight: MIN_TOUCH_TARGET_SIZE,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 16,
  },
  error: { color: "#dc2626" },
  button: {
    minHeight: MIN_TOUCH_TARGET_SIZE,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#1d4ed8",
    borderRadius: 8,
    marginTop: 12,
  },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
});
