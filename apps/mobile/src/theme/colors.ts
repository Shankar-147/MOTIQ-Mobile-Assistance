/**
 * Shared palette — "Midnight & Signal Green", dark only. Legacy keys from the
 * earlier light/indigo palette are kept and re-pointed at their dark
 * equivalents so screens that have not been redesigned yet stay readable.
 */
export const COLORS = {
  bg: "#0B0B0F",
  surface: "#17171C",
  surfaceRaised: "#1F2026",
  border: "#2A2B33",

  text: "#FFFFFF",
  textSecondary: "#A1A3AD",
  textMuted: "#6B6E7A",

  accent: "#22E58B",
  accentInk: "#04210F",
  accentTint: "rgba(34, 229, 139, 0.14)",
  danger: "#FF4D4D",
  warning: "#FFB84D",

  // Legacy aliases (pre-redesign names) — dark-theme equivalents.
  primary: "#22E58B",
  primaryDark: "#1BC474",
  primaryDeep: "#17171C",
  dangerDark: "#D93636",
  success: "#22E58B",
  electric: "#22E58B",
  electricGlow: "rgba(34, 229, 139, 0.22)",
  bgTint: "#17171C",
  textPrimary: "#FFFFFF",
  textOnPrimary: "#04210F",
} as const;

export const SHADOW = {
  shadowColor: "#000000",
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.4,
  shadowRadius: 12,
  elevation: 6,
} as const;

/** Sora for display/numerals/titles, Plus Jakarta Sans for body — loaded at
 * the app root (App.tsx) and wired to gluestack's heading/body tokens. */
export const FONTS = {
  display: "Sora_700Bold",
  displaySemibold: "Sora_600SemiBold",
  body: "PlusJakartaSans_500Medium",
  bodyRegular: "PlusJakartaSans_400Regular",
  bodyBold: "PlusJakartaSans_700Bold",
} as const;
