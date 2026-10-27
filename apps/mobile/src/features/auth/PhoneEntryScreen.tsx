import React, { useState } from "react";
import { Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { UserRole } from "@motiq/types";
import { AuthStackParamList } from "../../navigation/types";
import { authApi } from "../../api/authApi";
import { KeyboardScreen } from "../../components/KeyboardScreen";
import { Button, Input } from "../../components/ui";
import { COLORS, FONTS } from "../../theme/colors";

type Props = NativeStackScreenProps<AuthStackParamList, "PhoneEntry">;

export function PhoneEntryScreen({ route, navigation }: Props) {
  const { intendedRole } = route.params;
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    setError(null);
    setSubmitting(true);
    try {
      await authApi.requestOtp(phone, email);
      navigation.navigate("OtpVerify", { phone, intendedRole });
    } catch {
      setError("Couldn't send a verification code. Check the number and email and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <KeyboardScreen contentContainerStyle={{ gap: 20 }}>
      <View style={{ gap: 8, paddingTop: 8 }}>
        <Text style={{ fontFamily: FONTS.display, fontSize: 30, color: COLORS.text }}>
          {intendedRole === UserRole.PROVIDER ? "Provider sign-in" : "Sign in"}
        </Text>
        <Text style={{ fontFamily: FONTS.body, fontSize: 15, color: COLORS.textSecondary, lineHeight: 22 }}>
          Enter your number and email. We'll send a one-time code to your email.
        </Text>
      </View>

      <Input label="Phone number" value={phone} onChangeText={setPhone} placeholder="+91XXXXXXXXXX" keyboardType="phone-pad" />
      <Input
        label="Email"
        value={email}
        onChangeText={setEmail}
        placeholder="you@example.com"
        keyboardType="email-address"
        autoCapitalize="none"
      />

      {error ? <Text style={{ fontFamily: FONTS.body, fontSize: 14, color: COLORS.warning }}>{error}</Text> : null}

      <Button
        label={submitting ? "Sending…" : "Send code"}
        accessibilityLabel="Send verification code"
        disabled={submitting || phone.length < 8 || email.length < 5}
        loading={submitting}
        onPress={handleSubmit}
      />
    </KeyboardScreen>
  );
}
