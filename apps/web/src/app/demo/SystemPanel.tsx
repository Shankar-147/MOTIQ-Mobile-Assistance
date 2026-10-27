"use client";

import React from "react";
import { useScenario, LogSource } from "./scenario";
import { FLOW_STEPS, prettyStatus } from "./lib";

const SOURCE_STYLE: Record<LogSource, string> = {
  Customer: "bg-[#22E58B]/15 text-[#22E58B]",
  Provider: "bg-[#FFB84D]/15 text-[#FFB84D]",
  Server: "bg-[#7DB5FF]/15 text-[#7DB5FF]",
  AI: "bg-[#C084FC]/15 text-[#C084FC]",
  Payment: "bg-[#F472B6]/15 text-[#F472B6]",
};

const ADMIN_PAGES: { label: string; path: string }[] = [
  { label: "Dashboard", path: "/" },
  { label: "Dispatch", path: "/dispatch" },
  { label: "Providers", path: "/providers" },
  { label: "Verifications", path: "/verifications" },
  { label: "SOS", path: "/sos" },
  { label: "Settings", path: "/settings" },
  { label: "Audit log", path: "/audit-log" },
];

/** The system side: the request's live state and event log, plus the real admin console. */
export function SystemPanel() {
  const { requestId, requestStatus, logs, tab, adminPath, openTab } = useScenario();
  const stepIndex = requestStatus ? FLOW_STEPS.indexOf(requestStatus as (typeof FLOW_STEPS)[number]) : -1;

  return (
    <div className="flex h-[740px] min-w-0 flex-col overflow-hidden rounded-[28px] border border-[#2A2B33] bg-[#0F1014] text-white">
      <div className="flex shrink-0 items-center gap-2 border-b border-[#2A2B33] p-2">
        {(
          [
            ["system", "🧠 Live system"],
            ["admin", "🛠 Admin console"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            onClick={() => openTab(key)}
            className={`rounded-xl px-4 py-2 text-xs font-bold ${tab === key ? "bg-[#22E58B] text-[#04210F]" : "bg-[#1F2026] text-[#A1A3AD]"}`}
          >
            {label}
          </button>
        ))}
        {tab === "admin" ? (
          <div className="ml-2 flex flex-wrap gap-1">
            {ADMIN_PAGES.map((page) => (
              <button
                key={page.path}
                onClick={() => openTab("admin", page.path)}
                className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold ${adminPath === page.path ? "bg-white text-black" : "bg-[#1F2026] text-[#A1A3AD]"}`}
              >
                {page.label}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      {tab === "admin" ? (
        <div className="min-h-0 flex-1 bg-white">
          <iframe key={adminPath} src={adminPath} title="Admin console" className="h-full w-full border-0" />
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4">
          <div>
            <div className="mb-2 text-[11px] font-bold uppercase tracking-[0.18em] text-[#A1A3AD]">Service-request state machine</div>
            <div className="flex flex-wrap gap-1.5">
              {FLOW_STEPS.map((step, i) => (
                <span
                  key={step}
                  className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${
                    i < stepIndex
                      ? "bg-[#22E58B]/20 text-[#22E58B]"
                      : i === stepIndex
                        ? "bg-[#22E58B] text-[#04210F]"
                        : "bg-[#1F2026] text-[#6B6E7A]"
                  }`}
                >
                  {prettyStatus(step)}
                </span>
              ))}
            </div>
            {requestId ? (
              <div className="mt-2 text-[11px] text-[#6B6E7A]">
                Request {requestId.slice(0, 8)}… · current: <span className="font-bold text-white">{requestStatus ? prettyStatus(requestStatus) : "—"}</span>
              </div>
            ) : (
              <div className="mt-2 text-[11px] text-[#6B6E7A]">No active request yet.</div>
            )}
          </div>

          <div className="min-h-0 flex-1">
            <div className="mb-2 text-[11px] font-bold uppercase tracking-[0.18em] text-[#A1A3AD]">Live event log</div>
            {logs.length === 0 ? (
              <div className="text-xs text-[#6B6E7A]">Events from both phones and the server appear here as they happen.</div>
            ) : (
              <div className="flex flex-col gap-1.5">
                {logs.map((entry) => (
                  <div key={entry.id} className="flex items-start gap-2 rounded-xl bg-[#17171C] px-3 py-2 text-xs">
                    <span className="shrink-0 pt-0.5 font-mono text-[10px] text-[#6B6E7A]">{entry.time}</span>
                    <span className={`shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-bold ${SOURCE_STYLE[entry.source]}`}>{entry.source}</span>
                    <span className="text-[#D4D6DE]">{entry.text}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
