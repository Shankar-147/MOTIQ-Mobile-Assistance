import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Sora } from "next/font/google";
import "./globals.css";

// Same type pairing as apps/mobile/src/theme/colors.ts's FONTS (Sora for
// display/numbers, Plus Jakarta Sans for body) so the two apps read as one
// product despite using separate styling systems (Tailwind here, gluestack
// there — CLAUDE.md keeps gluestack-ui mobile-only).
const bodyFont = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});
const displayFont = Sora({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

export const metadata: Metadata = {
  title: "MOTIQ — Admin & Operations Console",
  description: "Internal ops/support console. See docs/decisions/0008-*.md — not the customer-facing product.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${bodyFont.variable} ${displayFont.variable}`}>
      <body className="min-h-screen bg-canvas font-sans text-slate-900 antialiased">{children}</body>
    </html>
  );
}
