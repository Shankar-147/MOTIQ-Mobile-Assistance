/**
 * A small shared palette so the live-tracking screens (and anything built
 * after them) stop each hand-rolling their own slightly-different blues and
 * grays. Not a full design system — just enough consistency to read as one
 * product instead of a pile of independently-styled screens.
 */
export const COLORS = {
  primary: "#4F46E5",
  primaryDark: "#4338CA",
  danger: "#dc2626",
  dangerDark: "#b91c1c",
  success: "#16a34a",
  warning: "#d97706",

  bg: "#f8fafc",
  surface: "#ffffff",
  border: "#e2e8f0",

  textPrimary: "#0f172a",
  textSecondary: "#64748b",
  textOnPrimary: "#ffffff",
} as const;

export const SHADOW = {
  shadowColor: "#0f172a",
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.12,
  shadowRadius: 12,
  elevation: 6,
} as const;
