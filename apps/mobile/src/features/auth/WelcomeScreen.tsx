import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { UserRole } from "@motiq/types";
import { AuthStackParamList } from "../../navigation/types";
import { MIN_TOUCH_TARGET_SIZE } from "../../accessibility/a11y";

type Props = NativeStackScreenProps<AuthStackParamList, "Welcome">;

export function WelcomeScreen({ navigation }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>MOTIQ</Text>
      <Text style={styles.subtitle}>Roadside assistance, on demand.</Text>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Continue as a customer"
        style={styles.button}
        onPress={() => navigation.navigate("PhoneEntry", { intendedRole: UserRole.CUSTOMER })}
      >
        <Text style={styles.buttonText}>I need assistance (Customer)</Text>
      </Pressable>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Continue as a provider"
        style={[styles.button, styles.secondaryButton]}
        onPress={() => navigation.navigate("PhoneEntry", { intendedRole: UserRole.PROVIDER })}
      >
        <Text style={styles.buttonText}>I provide roadside assistance (Provider)</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", padding: 24, gap: 16 },
  title: { fontSize: 32, fontWeight: "700", textAlign: "center" },
  subtitle: { fontSize: 16, textAlign: "center", marginBottom: 24, color: "#555" },
  button: {
    minHeight: MIN_TOUCH_TARGET_SIZE,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#1d4ed8",
    borderRadius: 8,
    paddingHorizontal: 16,
  },
  secondaryButton: { backgroundColor: "#334155" },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "600", textAlign: "center" },
});
