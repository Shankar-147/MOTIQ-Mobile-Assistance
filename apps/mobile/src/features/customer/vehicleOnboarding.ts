import * as SecureStore from "expo-secure-store";

const ONBOARDING_DONE_KEY_PREFIX = "motiq.vehicleOnboardingDone.";

/** Tracks, per user, whether the skippable "add your vehicle" onboarding step
 * has already been shown once (via Skip or a successful add) — same
 * SecureStore instance authStore.ts uses for the session, so this survives
 * app restarts without needing a backend "is this a new user" flag. */
export async function hasSeenVehicleOnboarding(userId: string): Promise<boolean> {
  const value = await SecureStore.getItemAsync(ONBOARDING_DONE_KEY_PREFIX + userId);
  return value === "true";
}

export async function markVehicleOnboardingSeen(userId: string): Promise<void> {
  await SecureStore.setItemAsync(ONBOARDING_DONE_KEY_PREFIX + userId, "true");
}
