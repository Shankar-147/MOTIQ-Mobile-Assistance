"use server";

import { revalidatePath } from "next/cache";
import { apiFetch } from "@/lib/api";

export async function reviewDocumentAction(documentId: string, decision: "APPROVED" | "REJECTED") {
  await apiFetch(`/admin/providers/verification-documents/${documentId}/review`, {
    method: "PATCH",
    body: JSON.stringify({ decision }),
  });
  revalidatePath("/verifications");
  revalidatePath("/");
}
