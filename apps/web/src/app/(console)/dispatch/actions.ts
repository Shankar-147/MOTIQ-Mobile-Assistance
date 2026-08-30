"use server";

import { revalidatePath } from "next/cache";
import { apiFetch, ApiError } from "@/lib/api";

export interface DispatchOverrideState {
  error: string | null;
}

/** Ch61's admin manual dispatch override — the guarded checks (same-city,
 * verification eligibility, request status) all live server-side in
 * MatchingService.adminOverrideDispatch(); this action just surfaces
 * whatever the backend rejects, exactly like providers/actions.ts does for
 * verification-status transitions. */
export async function dispatchOverrideAction(
  serviceRequestId: string,
  _prevState: DispatchOverrideState,
  formData: FormData,
): Promise<DispatchOverrideState> {
  const providerProfileId = formData.get("providerProfileId") as string;
  const reason = (formData.get("reason") as string) || undefined;

  if (!providerProfileId) {
    return { error: "Choose a provider first." };
  }

  try {
    await apiFetch(`/admin/requests/${serviceRequestId}/dispatch-override`, {
      method: "POST",
      body: JSON.stringify({ providerProfileId, reason }),
    });
  } catch (error) {
    if (error instanceof ApiError) {
      return { error: error.message };
    }
    return { error: "Failed to override dispatch." };
  }
  revalidatePath("/dispatch");
  return { error: null };
}
