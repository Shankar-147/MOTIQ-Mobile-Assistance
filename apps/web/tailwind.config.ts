import type { Config } from "tailwindcss";

/**
 * Shared token set with apps/mobile/src/theme/colors.ts (CLAUDE.md:
 * gluestack-ui stays mobile-only, but the admin console should still read
 * as the same product — same palette/type scale, expressed in Tailwind
 * instead of gluestack components).
 */
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#4F46E5",
          dark: "#4338CA",
          deep: "#1E1B4B",
          50: "#EEF0FF",
          100: "#E0E3FF",
        },
        danger: { DEFAULT: "#dc2626", dark: "#b91c1c" },
        success: { DEFAULT: "#16a34a" },
        warning: { DEFAULT: "#d97706" },
        electric: "#A3E635",
        surface: "#ffffff",
        canvas: "#f8fafc",
        tint: "#F6F6FB",
        // Secondary accents for chart/category differentiation (Ramp/
        // Mercury-style redesign) — not a general-purpose palette, just
        // enough to tell series apart on a trend chart.
        chart: { teal: "#14B8A6", amber: "#F59E0B", purple: "#A855F7" },
      },
      fontFamily: {
        sans: ["var(--font-body)", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "system-ui", "sans-serif"],
      },
      borderRadius: {
        card: "1rem",
        pill: "9999px",
      },
      boxShadow: {
        card: "0 1px 2px 0 rgb(15 23 42 / 0.04), 0 4px 16px -4px rgb(15 23 42 / 0.08)",
        "card-hover": "0 4px 8px 0 rgb(15 23 42 / 0.06), 0 12px 24px -6px rgb(15 23 42 / 0.12)",
      },
    },
  },
  plugins: [],
};

export default config;
