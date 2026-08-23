"use server";

import { revalidatePath } from "next/cache";
import { apiFetch, ApiError } from "@/lib/api";
import type { ProviderVerificationStatus } from "@motiq/types";

export interface UpdateStatusState {
  error: string | null;
}

export async function updateVerificationStatusAction(
  providerProfileId: string,
  _prevState: UpdateStatusState,
  formData: FormData,
): Promise<UpdateStatusState> {
  const status = formData.get("status") as ProviderVerificationStatus;
  try {
    await apiFetch(`/admin/providers/${providerProfileId}/verification-status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
  } catch (error) {
    // The guarded state machine (Ch98, ADR 0016) is the source of truth for
    // which transitions are valid — this UI doesn't replicate that graph,
    // it just surfaces whatever the backend rejects.
    if (error instanceof ApiError) {
      return { error: error.message };
    }
    return { error: "Failed to update verification status." };
  }
  revalidatePath("/providers");
  return { error: null };
}
