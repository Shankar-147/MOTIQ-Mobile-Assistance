import { config as defaultConfig } from "@gluestack-ui/config";

/**
 * MOTIQ's brand palette, layered onto gluestack's default token set — this
 * is the officially-supported customization path (override `tokens.colors`
 * on the config object gluestack's style engine already resolves `$primary600`
 * etc. against, rather than a component-by-component style patch).
 *
 * Primary: an indigo/violet, distinct from gluestack's stock generic blue —
 * reads as "trustworthy tech platform," not a default component-library demo.
 * Semantic error/success/warning scales are left as gluestack's own
 * (already accessibility-tuned) rather than reinvented.
 */
const motiqPrimary = {
  primary0: "#F5F3FF",
  primary50: "#EEF2FF",
  primary100: "#E0E7FF",
  primary200: "#C7D2FE",
  primary300: "#A5B4FC",
  primary400: "#818CF8",
  primary500: "#6366F1",
  primary600: "#4F46E5",
  primary700: "#4338CA",
  primary800: "#3730A3",
  primary900: "#312E81",
  primary950: "#1E1B4B",
};

export const motiqConfig = {
  ...defaultConfig,
  tokens: {
    ...defaultConfig.tokens,
    colors: {
      ...defaultConfig.tokens.colors,
      ...motiqPrimary,
    },
  },
};
