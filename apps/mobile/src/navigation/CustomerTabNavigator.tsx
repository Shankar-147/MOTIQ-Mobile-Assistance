import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { History, House, UserRound } from "lucide-react-native";
import { CustomerTabParamList } from "./types";
import { CustomerHomeScreen } from "../features/customer/CustomerHomeScreen";
import { CustomerHistoryScreen } from "../features/customer/CustomerHistoryScreen";
import { CustomerProfileScreen } from "../features/customer/CustomerProfileScreen";

const Tab = createBottomTabNavigator<CustomerTabParamList>();

const TAB_ICONS: Record<keyof CustomerTabParamList, typeof House> = {
  Home: House,
  History: History,
  Profile: UserRound,
};

/** Ch71 — the Customer app's landing surface: Home (request CTA + active
 * request), History (past requests), Profile. CreateRequest/TrackRequest/
 * RateProvider stay on the parent stack (CustomerNavigator) since they're
 * one-off flows, not persistent destinations. */
export function CustomerTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: true,
        headerTitleStyle: { fontWeight: "700" },
        tabBarActiveTintColor: "#4F46E5",
        tabBarInactiveTintColor: "#94A3B8",
        tabBarLabelStyle: { fontSize: 11, fontWeight: "600" },
        tabBarIcon: ({ color, size, focused }) => {
          const Icon = TAB_ICONS[route.name as keyof CustomerTabParamList];
          return <Icon color={color} size={size} strokeWidth={focused ? 2.4 : 2} />;
        },
      })}
    >
      <Tab.Screen name="Home" component={CustomerHomeScreen} options={{ title: "MOTIQ" }} />
      <Tab.Screen name="History" component={CustomerHistoryScreen} options={{ title: "Your requests" }} />
      <Tab.Screen name="Profile" component={CustomerProfileScreen} options={{ title: "Profile" }} />
    </Tab.Navigator>
  );
}
