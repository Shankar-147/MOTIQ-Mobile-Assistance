import React from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { UserRole } from "@motiq/types";
import { useAuthStore } from "../store/authStore";
import { AuthNavigator } from "./AuthNavigator";
import { CustomerNavigator } from "./CustomerNavigator";
import { ProviderNavigator } from "./ProviderNavigator";

/**
 * Ch65 — picks the right navigation stack from session state: no session ->
 * AuthNavigator; CUSTOMER -> CustomerNavigator; PROVIDER -> ProviderNavigator.
 * ADMIN/SUPPORT have no mobile stack at all (ADR 0008: that's apps/web).
 */
export function RootNavigator() {
  const { user, hydrated } = useAuthStore();

  if (!hydrated) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!user) {
    return <AuthNavigator />;
  }

  if (user.role === UserRole.CUSTOMER) {
    return <CustomerNavigator />;
  }

  if (user.role === UserRole.PROVIDER) {
    return <ProviderNavigator />;
  }

  return (
    <View style={styles.centered}>
      <Text>Admin/Support accounts sign in at the MOTIQ Admin Console, not the mobile app.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
});
