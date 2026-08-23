"use server";

import { revalidatePath } from "next/cache";
import { apiFetch, ApiError } from "@/lib/api";
import type { ServiceAreaLaunchPhase } from "@motiq/types";

export interface FormState {
  error: string | null;
}

export async function createServiceAreaAction(_prevState: FormState, formData: FormData): Promise<FormState> {
  const name = String(formData.get("name") ?? "");
  try {
    await apiFetch("/service-areas", {
      method: "POST",
      body: JSON.stringify({ name }),
    });
  } catch (error) {
    return { error: error instanceof ApiError ? error.message : "Failed to create service area." };
  }
  revalidatePath("/service-areas");
  return { error: null };
}

export async function advanceLaunchPhaseAction(serviceAreaId: string, launchPhase: ServiceAreaLaunchPhase) {
  await apiFetch(`/service-areas/${serviceAreaId}/launch-phase`, {
    method: "PATCH",
    body: JSON.stringify({ launchPhase }),
  });
  revalidatePath("/service-areas");
}

export async function setFareConfigAction(_prevState: FormState, formData: FormData): Promise<FormState> {
  const serviceAreaId = String(formData.get("serviceAreaId") ?? "");
  try {
    await apiFetch("/fare-configs", {
      method: "POST",
      body: JSON.stringify({
        serviceAreaId,
        baseFare: Number(formData.get("baseFare")),
        perKmRate: Number(formData.get("perKmRate")),
        maxSurgeMultiplier: formData.get("maxSurgeMultiplier")
          ? Number(formData.get("maxSurgeMultiplier"))
          : undefined,
        effectiveFrom: new Date().toISOString(),
      }),
    });
  } catch (error) {
    return { error: error instanceof ApiError ? error.message : "Failed to set fare config." };
  }
  revalidatePath(`/service-areas/${serviceAreaId}`);
  return { error: null };
}

export async function setCommissionRateAction(_prevState: FormState, formData: FormData): Promise<FormState> {
  const serviceAreaId = String(formData.get("serviceAreaId") ?? "");
  try {
    await apiFetch("/commission-rates", {
      method: "POST",
      body: JSON.stringify({
        serviceAreaId,
        ratePercentage: Number(formData.get("ratePercentage")),
        effectiveFrom: new Date().toISOString(),
      }),
    });
  } catch (error) {
    return { error: error instanceof ApiError ? error.message : "Failed to set commission rate." };
  }
  revalidatePath(`/service-areas/${serviceAreaId}`);
  return { error: null };
}
