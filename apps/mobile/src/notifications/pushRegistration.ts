import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { DevicePlatform } from "@motiq/types";
import { apiClient } from "../api/client";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/**
 * Ch70. Only registers on Android: the backend's PushGatewayPort
 * (ADR 0017) is an FCM adapter, and Android's native push token IS an FCM
 * token. iOS push goes through APNs, a different service the backend has no
 * adapter for yet — registering an APNs token here would silently go
 * nowhere, so this intentionally no-ops on iOS until that adapter exists.
 * Tracked in docs/roadmap.md's Reconciliation Notes, not silently assumed done.
 */
export async function registerForPushNotifications(): Promise<void> {
  if (Platform.OS !== "android") {
    return;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== "granted") {
    return;
  }

  const tokenResponse = await Notifications.getDevicePushTokenAsync();
  await apiClient.post("/notifications/device-tokens", {
    token: tokenResponse.data,
    platform: DevicePlatform.ANDROID,
  });
}

/**
 * Ch70's "silent push for state sync" category is represented by the data
 * payload shape NotificationEventListener sends (serviceRequestId /
 * assignmentId, see apps/api's notification-event.listener.ts) — this reads
 * that payload back out when the user taps a notification, so navigation
 * (see App.tsx) can deep-link straight to the relevant screen.
 */
export function addNotificationTapListener(
  handler: (data: Record<string, unknown>) => void,
): () => void {
  const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
    handler(response.notification.request.content.data as Record<string, unknown>);
  });
  return () => subscription.remove();
}
