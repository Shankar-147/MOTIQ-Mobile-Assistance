import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { ProviderStackParamList } from "./types";
import { GoOnlineScreen } from "../features/provider/GoOnlineScreen";
import { JobOfferScreen } from "../features/provider/JobOfferScreen";
import { ActiveJobScreen } from "../features/provider/ActiveJobScreen";

const Stack = createNativeStackNavigator<ProviderStackParamList>();

/**
 * Ch65/Ch72 — the Provider app's navigation stack, built to equal depth with
 * CustomerNavigator (Ch72's named correction of a V0 gap where the provider
 * side was thinner than the customer side).
 */
export function ProviderNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: true }}>
      <Stack.Screen name="GoOnline" component={GoOnlineScreen} options={{ title: "MOTIQ Provider" }} />
      <Stack.Screen name="JobOffer" component={JobOfferScreen} options={{ title: "New job offer" }} />
      <Stack.Screen name="ActiveJob" component={ActiveJobScreen} options={{ title: "Active job" }} />
    </Stack.Navigator>
  );
}
