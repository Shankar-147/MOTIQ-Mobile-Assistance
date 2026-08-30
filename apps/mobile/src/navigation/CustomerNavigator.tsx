import React, { useEffect, useState } from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { CustomerStackParamList } from "./types";
import { CustomerTabNavigator } from "./CustomerTabNavigator";
import { CreateRequestScreen } from "../features/customer/CreateRequestScreen";
import { MatchingScreen } from "../features/customer/MatchingScreen";
import { TrackRequestScreen } from "../features/customer/TrackRequestScreen";
import { RequestDetailScreen } from "../features/customer/RequestDetailScreen";
import { MakePaymentScreen } from "../features/customer/MakePaymentScreen";
import { RateProviderScreen } from "../features/customer/RateProviderScreen";
import { AddEditVehicleScreen } from "../features/customer/AddEditVehicleScreen";
import { VehicleHealthScreen } from "../features/customer/VehicleHealthScreen";
import { AddMaintenanceRecordScreen } from "../features/customer/AddMaintenanceRecordScreen";
import { ReminderSettingsScreen } from "../features/customer/ReminderSettingsScreen";
import { hasSeenVehicleOnboarding } from "../features/customer/vehicleOnboarding";
import { vehicleApi } from "../api/vehicleApi";
import { useAuthStore } from "../store/authStore";
import { LoadingScreen } from "../components/ui";

const Stack = createNativeStackNavigator<CustomerStackParamList>();

/** Ch65/Ch71 — the Customer app's navigation stack. MainTabs (Home/History/
 * Profile) is the landing surface; the rest are one-off flows pushed on top.
 * A first-time customer with zero vehicles who hasn't skipped before lands on
 * the skippable "add your vehicle" step instead (see vehicleOnboarding.ts) —
 * a purely local/device check, no backend "new user" flag involved. */
export function CustomerNavigator() {
  const userId = useAuthStore((state) => state.user?.userId);
  const [initialRouteName, setInitialRouteName] = useState<"MainTabs" | "VehicleOnboarding" | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function resolveInitialRoute() {
      if (!userId) {
        return;
      }
      const seen = await hasSeenVehicleOnboarding(userId);
      if (seen) {
        if (!cancelled) setInitialRouteName("MainTabs");
        return;
      }
      try {
        const response = await vehicleApi.listMine();
        const vehicleCount = (response.data as { data: unknown[] }).data.length;
        if (!cancelled) setInitialRouteName(vehicleCount > 0 ? "MainTabs" : "VehicleOnboarding");
      } catch {
        if (!cancelled) setInitialRouteName("MainTabs");
      }
    }
    resolveInitialRoute();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  if (!initialRouteName) {
    return <LoadingScreen />;
  }

  return (
    <Stack.Navigator initialRouteName={initialRouteName} screenOptions={{ headerShown: true }}>
      <Stack.Screen name="MainTabs" component={CustomerTabNavigator} options={{ headerShown: false }} />
      <Stack.Screen
        name="CreateRequest"
        component={CreateRequestScreen}
        options={{ title: "Request assistance" }}
      />
      <Stack.Screen name="Matching" component={MatchingScreen} options={{ headerShown: false }} />
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
        name="MakePayment"
        component={MakePaymentScreen}
        options={{ title: "Pay for service" }}
      />
      <Stack.Screen
        name="RateProvider"
        component={RateProviderScreen}
        options={{ title: "Rate your provider" }}
      />
      <Stack.Screen
        name="AddVehicle"
        component={AddEditVehicleScreen}
        options={({ route }) => ({
          title: route.params?.vehicleId ? "Edit vehicle" : "Add vehicle",
        })}
      />
      <Stack.Screen
        name="VehicleOnboarding"
        component={AddEditVehicleScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen name="VehicleHealth" component={VehicleHealthScreen} options={{ title: "Vehicle health" }} />
      <Stack.Screen
        name="AddMaintenanceRecord"
        component={AddMaintenanceRecordScreen}
        options={{ title: "Add service record" }}
      />
      <Stack.Screen
        name="ReminderSettings"
        component={ReminderSettingsScreen}
        options={{ title: "Reminder settings" }}
      />
    </Stack.Navigator>
  );
}
