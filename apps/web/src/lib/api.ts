import { redirect } from "next/navigation";
import { getAccessToken } from "./session";

/**
 * Server-only BFF fetch helper (CLAUDE.md: apps/web talks to apps/api only
 * through the versioned REST API, never direct DB access). Used from Server
 * Components, Route Handlers, and Server Actions — never from client code,
 * since it reads the httpOnly session cookie via next/headers.
 */
const API_BASE_URL = process.env.MOTIQ_API_BASE_URL ?? "http://localhost:3001/api/v1";

export class ApiError extends Error {
  constructor(
    public status: number,
    detail: string,
  ) {
    super(detail);
  }
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const accessToken = getAccessToken();
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...init?.headers,
    },
    cache: "no-store",
  });

  if (response.status === 401) {
    // No silent refresh inside a Server Component render — see session.ts's
    // doc comment. The access token expired or was never set; send the
    // admin back to log in again.
    redirect("/login");
  }

  if (!response.ok) {
    const body = await response.json().catch(() => ({ detail: response.statusText }));
    throw new ApiError(response.status, (body as { detail?: string }).detail ?? "Request failed");
  }

  if (response.status === 204) {
    return undefined as T;
  }
  return response.json() as Promise<T>;
}
