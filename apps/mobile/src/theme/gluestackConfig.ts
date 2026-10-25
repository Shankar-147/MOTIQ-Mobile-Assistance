import { config as defaultConfig } from "@gluestack-ui/config";

/**
 * MOTIQ's dark palette ("Midnight & Signal Green") layered onto gluestack's
 * token set. Primary is signal green anchored at primary600. The legacy
 * light-mode tokens (backgroundLight*, textLight*, borderLight*, primary
 * tints) are remapped to dark equivalents so screens not yet redesigned
 * stay readable. `$white` is left white: it is used for text on fills.
 */
const motiqPrimary = {
  primary0: "#0F2A1E",
  primary50: "#12281E",
  primary100: "#143324",
  primary200: "#1A4A33",
  primary300: "#1E7A52",
  primary400: "#1FB874",
  primary500: "#22E58B",
  primary600: "#22E58B",
  primary700: "#22E58B",
  primary800: "#1BC474",
  primary900: "#169D5C",
  primary950: "#0F6B3F",
};

const darkRemap = {
  backgroundLight0: "#17171C",
  backgroundLight50: "#0B0B0F",
  backgroundLight100: "#1F2026",
  backgroundLight200: "#1F2026",
  backgroundLight300: "#2A2B33",
  textLight900: "#FFFFFF",
  textLight800: "#FFFFFF",
  textLight700: "#E6E7EB",
  textLight600: "#A1A3AD",
  textLight500: "#A1A3AD",
  textLight400: "#6B6E7A",
  borderLight100: "#2A2B33",
  borderLight200: "#2A2B33",
  borderLight300: "#2A2B33",
  borderLight400: "#3A3B44",
  error50: "#2A1414",
  error100: "#3A1818",
  error600: "#FF4D4D",
  error700: "#FF8080",
  warning100: "#2E2410",
  warning700: "#FFB84D",
  success100: "#0F2A1E",
};

export const motiqConfig = {
  ...defaultConfig,
  tokens: {
    ...defaultConfig.tokens,
    colors: {
      ...defaultConfig.tokens.colors,
      ...motiqPrimary,
      ...darkRemap,
    },
    // Sora/Plus Jakarta Sans were loaded at the app root (App.tsx) for the
    // Provider Home redesign, but gluestack's own `$heading`/`$body` font
    // tokens default to undefined (platform system font) — so every
    // <Heading>/<Text>/<ButtonText> across the rest of the app (everything
    // that hadn't individually opted in via theme/colors.ts's FONTS) was
    // still rendering in the system font. Setting the tokens here, once,
    // applies the same typography everywhere gluestack components are used,
    // instead of patching each screen individually.
    fonts: {
      ...defaultConfig.tokens.fonts,
      heading: "Sora_700Bold",
      body: "PlusJakartaSans_500Medium",
    },
  },
};
