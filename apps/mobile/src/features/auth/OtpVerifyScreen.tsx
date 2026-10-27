import React, { useEffect, useState } from "react";
import { Text, View } from "react-native";
import axios from "axios";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { ApiErrorEnvelope, UserRole } from "@motiq/types";
import { AuthStackParamList } from "../../navigation/types";
import { authApi } from "../../api/authApi";
import { serviceAreaApi } from "../../api/serviceAreaApi";
import { useAuthStore } from "../../store/authStore";
import { KeyboardScreen } from "../../components/KeyboardScreen";
import { Button, Chip, Input } from "../../components/ui";
import { COLORS, FONTS } from "../../theme/colors";

type Props = NativeStackScreenProps<AuthStackParamList, "OtpVerify">;

interface ServiceAreaOption {
  id: string;
  name: string;
}

/** Extracts the RFC-7807 `detail` a failed request actually carries (see
 * docs/api-conventions.md) instead of a canned message — this screen's
 * errors are usually about the registration fields, not the code itself
 * (e.g. "businessName and serviceAreaId are required..."), and a generic
 * "that code didn't work" was actively misleading about what to fix. */
function extractErrorDetail(error: unknown): string | null {
  if (axios.isAxiosError(error)) {
    return (error.response?.data as ApiErrorEnvelope | undefined)?.detail ?? null;
  }
  return null;
}

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
  const [serviceAreas, setServiceAreas] = useState<ServiceAreaOption[]>([]);
  const [serviceAreaId, setServiceAreaId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (intendedRole !== UserRole.PROVIDER) {
      return;
    }
    // Unauthenticated on purpose (ServiceAreaController) — a not-yet-
    // registered provider still needs to pick a real ServiceArea, not type
    // its UUID from memory.
    serviceAreaApi
      .list()
      .then((response) => {
        const areas = response.data as ServiceAreaOption[];
        setServiceAreas(areas);
        if (areas.length > 0) {
          setServiceAreaId((current) => current || areas[0].id);
        }
      })
      .catch(() => undefined);
  }, [intendedRole]);

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
    } catch (err) {
      setError(extractErrorDetail(err) ?? "That code didn't work. Check it and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <KeyboardScreen contentContainerStyle={{ gap: 20 }}>
      <View style={{ gap: 8, paddingTop: 8 }}>
        <Text style={{ fontFamily: FONTS.display, fontSize: 30, color: COLORS.text }}>Enter your code</Text>
        <Text style={{ fontFamily: FONTS.body, fontSize: 15, color: COLORS.textSecondary, lineHeight: 22 }}>
          We sent a 6-digit code for {phone}.
        </Text>
      </View>

      <Input
        label="Verification code"
        value={code}
        onChangeText={setCode}
        placeholder="6-digit code"
        keyboardType="number-pad"
      />

      {intendedRole === UserRole.CUSTOMER ? (
        <Input label="Your name" value={displayName} onChangeText={setDisplayName} placeholder="New accounts only" />
      ) : (
        <>
          <Input label="Business name" value={businessName} onChangeText={setBusinessName} placeholder="New accounts only" />
          <View style={{ gap: 8 }}>
            <Text style={{ fontFamily: FONTS.bodyBold, fontSize: 13, color: COLORS.textSecondary }}>
              Service area (new accounts only)
            </Text>
            {serviceAreas.length > 0 ? (
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                {serviceAreas.map((area) => (
                  <Chip
                    key={area.id}
                    label={area.name}
                    selected={serviceAreaId === area.id}
                    accessibilityLabel={`Service area: ${area.name}`}
                    onPress={() => setServiceAreaId(area.id)}
                  />
                ))}
              </View>
            ) : (
              <Text style={{ fontFamily: FONTS.body, fontSize: 14, color: COLORS.textMuted }}>Loading service areas…</Text>
            )}
          </View>
        </>
      )}

      {error ? <Text style={{ fontFamily: FONTS.body, fontSize: 14, color: COLORS.warning }}>{error}</Text> : null}

      <Button
        label={submitting ? "Verifying…" : "Verify"}
        accessibilityLabel="Verify code"
        disabled={submitting || code.length < 6}
        loading={submitting}
        onPress={handleVerify}
      />
    </KeyboardScreen>
  );
}
