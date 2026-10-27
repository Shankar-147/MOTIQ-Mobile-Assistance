"use client";

import React from "react";

/** A phone-shaped frame so each role reads as the mobile app it represents. */
export function Phone({ title, accent, children }: { title: string; accent: string; children: React.ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col items-center">
      <div className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em]" style={{ color: accent }}>
        <span className="h-2 w-2 rounded-full" style={{ background: accent }} />
        {title}
      </div>
      <div
        className="relative flex h-[740px] w-[360px] max-w-full flex-col overflow-hidden rounded-[36px] border border-[#2A2B33] bg-[#0B0B0F] shadow-[0_20px_60px_rgba(0,0,0,0.55)]"
        style={{ fontFamily: "var(--font-body), system-ui, sans-serif" }}
      >
        <div className="mx-auto mt-2 h-1.5 w-24 shrink-0 rounded-full bg-[#1F2026]" />
        <div className="relative flex min-h-0 flex-1 flex-col text-white">{children}</div>
      </div>
    </div>
  );
}

export function PrimaryButton({
  children,
  onClick,
  disabled,
  tone = "accent",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  tone?: "accent" | "danger" | "ghost";
}) {
  const styles =
    tone === "accent"
      ? "bg-[#22E58B] text-[#04210F]"
      : tone === "danger"
        ? "bg-[#FF4D4D] text-white"
        : "border border-[#2A2B33] bg-[#1F2026] text-white";
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`h-12 w-full rounded-2xl text-sm font-bold transition active:scale-[0.99] disabled:opacity-40 ${styles}`}
    >
      {children}
    </button>
  );
}

export function Pill({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "neutral" | "good" | "warn" | "bad" }) {
  const styles =
    tone === "good"
      ? "bg-[#22E58B]/15 text-[#22E58B]"
      : tone === "warn"
        ? "bg-[#FFB84D]/15 text-[#FFB84D]"
        : tone === "bad"
          ? "bg-[#FF4D4D]/15 text-[#FF4D4D]"
          : "bg-[#1F2026] text-[#A1A3AD]";
  return <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${styles}`}>{children}</span>;
}
