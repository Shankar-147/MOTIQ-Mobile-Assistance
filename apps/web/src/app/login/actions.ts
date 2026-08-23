"use server";

import { redirect } from "next/navigation";
import { setSessionCookies } from "@/lib/session";
import type { AdminLoginRequest, TokenPairResponse } from "@motiq/types";

const API_BASE_URL = process.env.MOTIQ_API_BASE_URL ?? "http://localhost:3001/api/v1";

export interface LoginState {
  error: string | null;
}

export async function loginAction(_prevState: LoginState, formData: FormData): Promise<LoginState> {
  const identifier = String(formData.get("identifier") ?? "");
  const password = String(formData.get("password") ?? "");
  const totpCode = String(formData.get("totpCode") ?? "");

  const body: AdminLoginRequest & { totpCode?: string } = {
    identifier,
    password,
    ...(totpCode ? { totpCode } : {}),
  };

  const response = await fetch(`${API_BASE_URL}/auth/admin/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const responseBody = await response.json().catch(() => ({ detail: "Login failed." }));
    return { error: (responseBody as { detail?: string }).detail ?? "Login failed." };
  }

  const tokens = (await response.json()) as TokenPairResponse;
  setSessionCookies(tokens.accessToken, tokens.refreshToken, tokens.expiresIn);
  redirect("/");
}
