// Dynamic config (replacing app.json) so googleServicesFile can resolve to
// the EAS-injected file environment variable during cloud builds — the real
// file is gitignored (Firebase project credentials) and isn't uploaded to
// EAS Build, which only sees git-tracked files. Locally (expo start/run),
// GOOGLE_SERVICES_JSON is unset, so it falls back to the checked-out file.
module.exports = {
  expo: {
    name: "MOTIQ",
    slug: "motiq-mobile",
    version: "0.1.0",
    orientation: "portrait",
    userInterfaceStyle: "automatic",
    newArchEnabled: true,
    icon: "./assets/icon.png",
    assetBundlePatterns: ["**/*"],
    ios: {
      supportsTablet: false,
      infoPlist: {
        NSLocationWhenInUseUsageDescription:
          "MOTIQ uses your location to find nearby roadside assistance and to share a provider's live location with you during a job.",
        NSLocationAlwaysAndWhenInUseUsageDescription:
          "MOTIQ providers share live location with the customer while a job is in progress (Ch68).",
      },
    },
    android: {
      package: "com.motiq.mobile",
      googleServicesFile: process.env.GOOGLE_SERVICES_JSON ?? "./google-services.json",
      permissions: ["ACCESS_FINE_LOCATION", "ACCESS_COARSE_LOCATION", "ACCESS_BACKGROUND_LOCATION", "CAMERA"],
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon-foreground.png",
        backgroundColor: "#0B0B0F",
      },
    },
    extra: {
      eas: {
        projectId: "178b67fe-e701-443a-bfb1-d92fcb828cc3",
      },
    },
    plugins: [
      "expo-font",
      [
        "expo-image-picker",
        {
          photosPermission: "MOTIQ lets you attach a photo of your vehicle problem so we can suggest the right help.",
          cameraPermission: "MOTIQ uses the camera so you can photograph your vehicle problem.",
        },
      ],
    ],
  },
};
