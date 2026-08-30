/**
 * A small shared palette so the live-tracking screens (and anything built
 * after them) stop each hand-rolling their own slightly-different blues and
 * grays. Not a full design system — just enough consistency to read as one
 * product instead of a pile of independently-styled screens.
 */
export const COLORS = {
  primary: "#4F46E5",
  primaryDark: "#4338CA",
  primaryDeep: "#1E1B4B",
  danger: "#dc2626",
  dangerDark: "#b91c1c",
  success: "#16a34a",
  warning: "#d97706",

  /** The Provider Home redesign's "electric" accent — a lime pop against
   * the indigo hero, used for the online-status pulse/toggle only, not a
   * general-purpose brand color. See docs discussion in the design canvas
   * this screen was mocked up from. */
  electric: "#A3E635",
  electricGlow: "rgba(163, 230, 53, 0.22)",

  bg: "#f8fafc",
  bgTint: "#F6F6FB",
  surface: "#ffffff",
  border: "#e2e8f0",

  textPrimary: "#0f172a",
  textSecondary: "#64748b",
  textMuted: "#8B87A6",
  textOnPrimary: "#ffffff",
} as const;

export const SHADOW = {
  shadowColor: "#0f172a",
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.12,
  shadowRadius: 12,
  elevation: 6,
} as const;

/** Google Fonts loaded at the app root (App.tsx) — Sora for display/numbers,
 * Plus Jakarta Sans as this screen's body face. Scoped to the Provider Home
 * redesign for now, not yet adopted app-wide (see CLAUDE.md's frontend
 * conventions note on keeping typography flexible, not a forced rollout). */
export const FONTS = {
  display: "Sora_700Bold",
  displaySemibold: "Sora_600SemiBold",
  body: "PlusJakartaSans_500Medium",
  bodyRegular: "PlusJakartaSans_400Regular",
  bodyBold: "PlusJakartaSans_700Bold",
} as const;
