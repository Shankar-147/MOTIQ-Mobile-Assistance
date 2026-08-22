import React, { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { AuthStackParamList } from "../../navigation/types";
import { authApi } from "../../api/authApi";
import { MIN_TOUCH_TARGET_SIZE } from "../../accessibility/a11y";

type Props = NativeStackScreenProps<AuthStackParamList, "PhoneEntry">;

export function PhoneEntryScreen({ route, navigation }: Props) {
  const { intendedRole } = route.params;
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    setError(null);
    setSubmitting(true);
    try {
      await authApi.requestOtp(phone);
      navigation.navigate("OtpVerify", { phone, intendedRole });
    } catch {
      setError("Couldn't send a verification code. Check the number and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Phone number</Text>
      <TextInput
        style={styles.input}
        keyboardType="phone-pad"
        placeholder="+91XXXXXXXXXX"
        value={phone}
        onChangeText={setPhone}
        accessibilityLabel="Phone number"
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Send verification code"
        style={styles.button}
        disabled={submitting || phone.length < 8}
        onPress={handleSubmit}
      >
        <Text style={styles.buttonText}>{submitting ? "Sending…" : "Send code"}</Text>
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
