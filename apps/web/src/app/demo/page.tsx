"use client";

import React, { useCallback, useEffect, useState } from "react";
import { CustomerPhone } from "./CustomerPhone";
import { ProviderPhone } from "./ProviderPhone";
import { SystemPanel } from "./SystemPanel";
import { ScenarioProvider, useScenario } from "./scenario";
import { API_BASE, TERMINAL_STATUSES } from "./lib";

function Header() {
  const { requestId, requestStatus, customer } = useScenario();
  const [apiUp, setApiUp] = useState<boolean | null>(null);

  useEffect(() => {
    const check = () =>
      fetch(`${API_BASE}/health`)
        .then((r) => setApiUp(r.ok))
        .catch(() => setApiUp(false));
    void check();
    const timer = setInterval(check, 8000);
    return () => clearInterval(timer);
  }, []);

  const reset = useCallback(async () => {
    if (requestId && requestStatus && !TERMINAL_STATUSES.has(requestStatus)) {
      await customer.call(`/requests/${requestId}/cancel`, { method: "PATCH" }).catch(() => undefined);
    }
    window.location.reload();
  }, [customer, requestId, requestStatus]);

  return (
    <div className="mx-auto mb-5 flex max-w-[1500px] flex-wrap items-center justify-between gap-3">
      <div className="font-display text-2xl font-extrabold tracking-tight">
        <span className="text-[#22E58B]">M</span>OTIQ <span className="text-[#A1A3AD]">· live demo</span>
      </div>
      <div className="flex items-center gap-2">
        <span
          className={`rounded-full px-3 py-1.5 text-[11px] font-bold ${apiUp ? "bg-[#22E58B]/15 text-[#22E58B]" : apiUp === false ? "bg-[#FF4D4D]/15 text-[#FF4D4D]" : "bg-[#1F2026] text-[#A1A3AD]"}`}
        >
          ● API {apiUp ? "online" : apiUp === false ? "unreachable" : "checking…"}
        </span>
        <button onClick={reset} className="rounded-xl border border-[#2A2B33] bg-[#1F2026] px-4 py-2 text-xs font-bold hover:bg-[#2A2B33]">
          ↺ Reset demo
        </button>
      </div>
    </div>
  );
}

export default function DemoPage() {
  return (
    <ScenarioProvider>
      <main className="min-h-screen bg-[#08080B] px-5 py-6 text-white" style={{ fontFamily: "var(--font-body), system-ui, sans-serif" }}>
        <Header />
        <div className="mx-auto grid max-w-[1500px] items-start gap-5 xl:grid-cols-[360px_360px_minmax(0,1fr)]">
          <CustomerPhone />
          <ProviderPhone />
          <SystemPanel />
        </div>
      </main>
    </ScenarioProvider>
  );
}
