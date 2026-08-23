"use server";

import { revalidatePath } from "next/cache";
import { apiFetch } from "@/lib/api";
import type { SosAlertStatus } from "@motiq/types";

export async function acknowledgeAlertAction(alertId: string) {
  await apiFetch(`/sos/alerts/${alertId}/acknowledge`, { method: "PATCH" });
  revalidatePath("/sos");
}

export async function resolveAlertAction(
  alertId: string,
  outcome: SosAlertStatus.RESOLVED | SosAlertStatus.FALSE_ALARM,
) {
  await apiFetch(`/sos/alerts/${alertId}/resolve`, {
    method: "PATCH",
    body: JSON.stringify({ outcome }),
  });
  revalidatePath("/sos");
}
