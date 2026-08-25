import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { ProviderStackParamList } from "./types";
import { ProviderTabNavigator } from "./ProviderTabNavigator";
import { JobOfferScreen } from "../features/provider/JobOfferScreen";
import { ActiveJobScreen } from "../features/provider/ActiveJobScreen";
import { KycUploadScreen } from "../features/provider/KycUploadScreen";

const Stack = createNativeStackNavigator<ProviderStackParamList>();

/**
 * Ch65/Ch72 — the Provider app's navigation stack, built to equal depth with
 * CustomerNavigator (Ch72's named correction of a V0 gap where the provider
 * side was thinner than the customer side). MainTabs (Home/Jobs/Profile) is
 * the landing surface; the rest are one-off flows pushed on top.
 */
export function ProviderNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: true }}>
      <Stack.Screen name="MainTabs" component={ProviderTabNavigator} options={{ headerShown: false }} />
      <Stack.Screen name="JobOffer" component={JobOfferScreen} options={{ title: "New job offer" }} />
      <Stack.Screen name="ActiveJob" component={ActiveJobScreen} options={{ headerShown: false }} />
      <Stack.Screen
        name="KycUpload"
        component={KycUploadScreen}
        options={{ title: "Verification documents" }}
      />
    </Stack.Navigator>
  );
}
