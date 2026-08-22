import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MOTIQ — Admin & Operations Console",
  description: "Internal ops/support console. See docs/decisions/0008-*.md — not the customer-facing product.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased">{children}</body>
    </html>
  );
}
