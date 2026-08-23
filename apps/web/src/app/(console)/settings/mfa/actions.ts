"use server";

import { revalidatePath } from "next/cache";
import { apiFetch, ApiError } from "@/lib/api";

export interface EnrollState {
  secret: string | null;
  otpauthUri: string | null;
  error: string | null;
}

export async function startEnrollmentAction(): Promise<EnrollState> {
  try {
    const result = await apiFetch<{ secret: string; otpauthUri: string }>("/auth/admin/mfa/enroll", {
      method: "POST",
    });
    return { secret: result.secret, otpauthUri: result.otpauthUri, error: null };
  } catch (error) {
    return {
      secret: null,
      otpauthUri: null,
      error: error instanceof ApiError ? error.message : "Failed to start enrollment.",
    };
  }
}

export interface ConfirmState {
  error: string | null;
  confirmed: boolean;
}

export async function confirmEnrollmentAction(
  _prevState: ConfirmState,
  formData: FormData,
): Promise<ConfirmState> {
  const code = String(formData.get("code") ?? "");
  try {
    await apiFetch("/auth/admin/mfa/confirm", { method: "POST", body: JSON.stringify({ code }) });
  } catch (error) {
    return { error: error instanceof ApiError ? error.message : "Failed to confirm enrollment.", confirmed: false };
  }
  revalidatePath("/settings/mfa");
  return { error: null, confirmed: true };
}

export async function disableMfaAction() {
  await apiFetch("/auth/admin/mfa", { method: "DELETE" });
  revalidatePath("/settings/mfa");
}
