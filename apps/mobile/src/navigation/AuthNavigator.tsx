import { COLORS } from "../theme/colors";
import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { AuthStackParamList } from "./types";
import { WelcomeScreen } from "../features/auth/WelcomeScreen";
import { PhoneEntryScreen } from "../features/auth/PhoneEntryScreen";
import { OtpVerifyScreen } from "../features/auth/OtpVerifyScreen";

const Stack = createNativeStackNavigator<AuthStackParamList>();

/** Ch65 — pre-login stack, shared by both Customer and Provider (role is picked on Welcome). */
export function AuthNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: true, headerStyle: { backgroundColor: COLORS.bg }, headerTintColor: COLORS.text, headerShadowVisible: false, contentStyle: { backgroundColor: COLORS.bg } }}>
      <Stack.Screen name="Welcome" component={WelcomeScreen} options={{ headerShown: false }} />
      <Stack.Screen name="PhoneEntry" component={PhoneEntryScreen} options={{ title: "Sign in" }} />
      <Stack.Screen name="OtpVerify" component={OtpVerifyScreen} options={{ title: "Verify code" }} />
    </Stack.Navigator>
  );
}
