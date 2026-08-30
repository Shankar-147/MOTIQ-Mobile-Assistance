import React, { useEffect } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { StatusBar } from "expo-status-bar";
import { GluestackUIProvider } from "@gluestack-ui/themed";
import { useFonts, Sora_600SemiBold, Sora_700Bold } from "@expo-google-fonts/sora";
import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_700Bold,
} from "@expo-google-fonts/plus-jakarta-sans";
import { motiqConfig } from "./src/theme/gluestackConfig";
import { RootNavigator } from "./src/navigation/RootNavigator";
import { useAuthStore } from "./src/store/authStore";
import { useConnectivityStore } from "./src/store/connectivityStore";
import { usePendingOfferStore } from "./src/store/pendingOfferStore";
import { watchConnectivityAndFlush } from "./src/api/offlineQueue";
import { addNotificationTapListener, registerForPushNotifications } from "./src/notifications/pushRegistration";
import { LoadingScreen } from "./src/components/ui";
import { LanguageProvider } from "./src/i18n/LanguageContext";

export default function App() {
  // Ch72's Provider Home redesign introduces Sora/Plus Jakarta Sans (see
  // theme/colors.ts's FONTS) — loaded once at the root, same pattern any
  // custom-font screen in this app will share, rather than re-loading
  // per-screen.
  const [fontsLoaded] = useFonts({
    Sora_600SemiBold,
    Sora_700Bold,
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_700Bold,
  });

  const hydrate = useAuthStore((state) => state.hydrate);
  const userId = useAuthStore((state) => state.user?.userId);
  const setConnected = useConnectivityStore((state) => state.setConnected);
  const setPendingOffer = usePendingOfferStore((state) => state.setPendingOffer);

  useEffect(() => {
    hydrate();

    // Ch67 — flush any locally-queued requests as soon as connectivity
    // returns, wired once at the app root rather than per-screen.
    const unsubscribeConnectivity = watchConnectivityAndFlush(setConnected, () => undefined);

    // Ch70 — a tapped "job_offer" notification hands its payload to
    // pendingOfferStore; GoOnlineScreen picks it up and navigates once the
    // Provider stack is mounted (see that screen's comment for why this
    // can't just call navigation.navigate() directly from here).
    const unsubscribeNotificationTap = addNotificationTapListener((data) => {
      if (typeof data.assignmentId === "string" && typeof data.serviceRequestId === "string") {
        setPendingOffer({ assignmentId: data.assignmentId, serviceRequestId: data.serviceRequestId });
      }
    });

    return () => {
      unsubscribeConnectivity();
      unsubscribeNotificationTap();
    };
  }, [hydrate, setConnected, setPendingOffer]);

  // Ch70 — registers the device's push token once a session exists, for
  // either role (Customer receives request/payment pushes, Provider
  // receives job-offer pushes — see notification-event.listener.ts on the
  // backend). GoOnlineScreen also registers on top of this for a Provider
  // going online, which is a harmless re-registration (registerDeviceToken
  // upserts by token), not a second source of truth.
  useEffect(() => {
    if (userId) {
      registerForPushNotifications().catch(() => undefined);
    }
  }, [userId]);

  return (
    <GluestackUIProvider config={motiqConfig}>
      <LanguageProvider>
        {fontsLoaded ? (
          <NavigationContainer>
            <StatusBar style="auto" />
            <RootNavigator />
          </NavigationContainer>
        ) : (
          <LoadingScreen />
        )}
      </LanguageProvider>
    </GluestackUIProvider>
  );
}
