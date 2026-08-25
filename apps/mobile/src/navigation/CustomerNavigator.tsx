import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { CustomerStackParamList } from "./types";
import { CustomerTabNavigator } from "./CustomerTabNavigator";
import { CreateRequestScreen } from "../features/customer/CreateRequestScreen";
import { TrackRequestScreen } from "../features/customer/TrackRequestScreen";
import { RequestDetailScreen } from "../features/customer/RequestDetailScreen";
import { RateProviderScreen } from "../features/customer/RateProviderScreen";

const Stack = createNativeStackNavigator<CustomerStackParamList>();

/** Ch65/Ch71 — the Customer app's navigation stack. MainTabs (Home/History/
 * Profile) is the landing surface; the rest are one-off flows pushed on top. */
export function CustomerNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: true }}>
      <Stack.Screen name="MainTabs" component={CustomerTabNavigator} options={{ headerShown: false }} />
      <Stack.Screen
        name="CreateRequest"
        component={CreateRequestScreen}
        options={{ title: "Request assistance" }}
      />
      <Stack.Screen
        name="TrackRequest"
        component={TrackRequestScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="RequestDetail"
        component={RequestDetailScreen}
        options={{ title: "Request details" }}
      />
      <Stack.Screen
        name="RateProvider"
        component={RateProviderScreen}
        options={{ title: "Rate your provider" }}
      />
    </Stack.Navigator>
  );
}
