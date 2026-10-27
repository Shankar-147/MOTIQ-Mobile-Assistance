"use client";

import React, { createContext, useCallback, useContext, useMemo, useState } from "react";
import { createSession, Session } from "./lib";

export type LogSource = "Customer" | "Provider" | "Server" | "AI" | "Payment";

export interface LogEntry {
  id: number;
  time: string;
  source: LogSource;
  text: string;
}

export type SystemTab = "system" | "admin";

interface Scenario {
  customer: Session;
  provider: Session;
  requestId: string | null;
  setRequestId(id: string | null): void;
  requestStatus: string | null;
  setRequestStatus(status: string | null): void;
  logs: LogEntry[];
  log(source: LogSource, text: string): void;
  tab: SystemTab;
  adminPath: string;
  openTab(tab: SystemTab, adminPath?: string): void;
}

const ScenarioContext = createContext<Scenario | null>(null);

export function useScenario(): Scenario {
  const value = useContext(ScenarioContext);
  if (!value) throw new Error("useScenario must be used inside <ScenarioProvider>");
  return value;
}

export function ScenarioProvider({ children }: { children: React.ReactNode }) {
  const customer = useMemo(() => createSession("CUSTOMER"), []);
  const provider = useMemo(() => createSession("PROVIDER"), []);
  const [requestId, setRequestId] = useState<string | null>(null);
  const [requestStatus, setRequestStatus] = useState<string | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [tab, setTab] = useState<SystemTab>("system");
  const [adminPath, setAdminPath] = useState("/");


  const log = useCallback((source: LogSource, text: string) => {
    setLogs((current) => [
      { id: (current[0]?.id ?? 0) + 1, time: new Date().toLocaleTimeString(), source, text },
      ...current.slice(0, 79),
    ]);
  }, []);

  const openTab = useCallback((next: SystemTab, path?: string) => {
    setTab(next);
    if (path) setAdminPath(path);
  }, []);

  const value = useMemo(
    () => ({
      customer,
      provider,
      requestId,
      setRequestId,
      requestStatus,
      setRequestStatus,
      logs,
      log,
      tab,
      adminPath,
      openTab,
    }),
    [customer, provider, requestId, requestStatus, logs, log, tab, adminPath, openTab],
  );

  return <ScenarioContext.Provider value={value}>{children}</ScenarioContext.Provider>;
}
