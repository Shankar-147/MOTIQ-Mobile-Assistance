"use client";

/**
 * Shared plumbing for the live web demo (/demo). The demo talks to the real
 * MOTIQ API from the browser using the demo-only sign-in
 * (POST /auth/demo-login, enabled only when the API runs with DEMO_MODE=true),
 * so a presentation never waits on an OTP email.
 */
export const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3001/api/v1";
export const WS_BASE = process.env.NEXT_PUBLIC_WS_URL ?? "http://localhost:3001";

/** The fixed pickup point used by the demo (Perungudi, Chennai), inside the seeded service area. */
export const DEMO_PICKUP = { latitude: 12.9655, longitude: 80.2461 };

export type DemoRole = "CUSTOMER" | "PROVIDER";

export interface Session {
  role: DemoRole;
  token(): string | null;
  login(): Promise<void>;
  call<T = unknown>(path: string, init?: { method?: string; body?: unknown }): Promise<T>;
}

export class ApiFailure extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export function createSession(role: DemoRole): Session {
  let accessToken: string | null = null;

  async function login() {
    const response = await fetch(`${API_BASE}/auth/demo-login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    });
    if (!response.ok) {
      throw new ApiFailure(
        response.status,
        response.status === 404
          ? "Demo sign-in is disabled — start the API with DEMO_MODE=true."
          : "Demo sign-in failed.",
      );
    }
    accessToken = ((await response.json()) as { accessToken: string }).accessToken;
  }

  async function call<T>(path: string, init?: { method?: string; body?: unknown }, retried = false): Promise<T> {
    if (!accessToken) await login();
    const response = await fetch(`${API_BASE}${path}`, {
      method: init?.method ?? "GET",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
      body: init?.body === undefined ? undefined : JSON.stringify(init.body),
    });
    if (response.status === 401 && !retried) {
      // The 15-minute access token expired mid-demo — sign in again and retry once.
      accessToken = null;
      return call<T>(path, init, true);
    }
    if (!response.ok) {
      const body = (await response.json().catch(() => ({}))) as { detail?: string };
      throw new ApiFailure(response.status, body.detail ?? response.statusText);
    }
    if (response.status === 204) return undefined as T;
    const text = await response.text();
    return (text ? JSON.parse(text) : undefined) as T;
  }

  return { role, token: () => accessToken, login, call: (path, init) => call(path, init) };
}

export const TERMINAL_STATUSES = new Set([
  "COMPLETED",
  "CANCELLED_BY_CUSTOMER",
  "CANCELLED_BY_PROVIDER",
  "EXPIRED",
  "FAILED",
]);

export const FLOW_STEPS = [
  "REQUESTED",
  "MATCHING",
  "ASSIGNED",
  "PROVIDER_ACCEPTED",
  "PROVIDER_EN_ROUTE",
  "ARRIVED",
  "SERVICE_IN_PROGRESS",
  "COMPLETED",
] as const;

export const ISSUES: { type: string; label: string; emoji: string }[] = [
  { type: "TOW", label: "Tow", emoji: "🚛" },
  { type: "FLAT_TYRE", label: "Flat tyre", emoji: "🛞" },
  { type: "FUEL", label: "Fuel", emoji: "⛽" },
  { type: "BATTERY_JUMP", label: "Battery", emoji: "🔋" },
  { type: "REPAIR", label: "Repair", emoji: "🔧" },
  { type: "OTHER", label: "Other", emoji: "❓" },
];

export function money(value: string | number | null | undefined): string {
  return `₹${Number(value ?? 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function prettyStatus(status: string): string {
  return status.replace(/_/g, " ").toLowerCase().replace(/^\w/, (c) => c.toUpperCase());
}
