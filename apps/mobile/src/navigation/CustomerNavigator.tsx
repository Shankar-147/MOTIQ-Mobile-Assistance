import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { CustomerStackParamList } from "./types";
import { CreateRequestScreen } from "../features/customer/CreateRequestScreen";
import { TrackRequestScreen } from "../features/customer/TrackRequestScreen";
import { RateProviderScreen } from "../features/customer/RateProviderScreen";

const Stack = createNativeStackNavigator<CustomerStackParamList>();

/** Ch65/Ch71 — the Customer app's navigation stack. */
export function CustomerNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: true }}>
      <Stack.Screen
        name="CreateRequest"
        component={CreateRequestScreen}
        options={{ title: "Request assistance" }}
      />
      <Stack.Screen
        name="TrackRequest"
        component={TrackRequestScreen}
        options={{ title: "Track your provider" }}
      />
      <Stack.Screen
        name="RateProvider"
        component={RateProviderScreen}
        options={{ title: "Rate your provider" }}
      />
    </Stack.Navigator>
  );
}
