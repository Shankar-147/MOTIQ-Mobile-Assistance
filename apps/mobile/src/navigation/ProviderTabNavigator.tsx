import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Briefcase, House, UserRound } from "lucide-react-native";
import { ProviderTabParamList } from "./types";
import { GoOnlineScreen } from "../features/provider/GoOnlineScreen";
import { ProviderJobsScreen } from "../features/provider/ProviderJobsScreen";
import { ProviderProfileScreen } from "../features/provider/ProviderProfileScreen";

const Tab = createBottomTabNavigator<ProviderTabParamList>();

const TAB_ICONS: Record<keyof ProviderTabParamList, typeof House> = {
  Home: House,
  Jobs: Briefcase,
  Profile: UserRound,
};

/**
 * Ch72's Provider app landing surface, built to equal depth with
 * CustomerTabNavigator. GoOnlineScreen (presence toggle) is Home; JobOffer/
 * ActiveJob/KycUpload stay on the parent stack (ProviderNavigator) as
 * one-off flows, not persistent destinations.
 */
export function ProviderTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: true,
        headerTitleStyle: { fontWeight: "700" },
        tabBarActiveTintColor: "#4F46E5",
        tabBarInactiveTintColor: "#94A3B8",
        tabBarLabelStyle: { fontSize: 11, fontWeight: "600" },
        tabBarIcon: ({ color, size, focused }) => {
          const Icon = TAB_ICONS[route.name as keyof ProviderTabParamList];
          return <Icon color={color} size={size} strokeWidth={focused ? 2.4 : 2} />;
        },
      })}
    >
      <Tab.Screen name="Home" component={GoOnlineScreen} options={{ title: "MOTIQ Provider" }} />
      <Tab.Screen name="Jobs" component={ProviderJobsScreen} options={{ title: "Job history" }} />
      <Tab.Screen name="Profile" component={ProviderProfileScreen} options={{ title: "Profile" }} />
    </Tab.Navigator>
  );
}
