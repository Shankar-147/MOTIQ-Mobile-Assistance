"use client";

import { useFormState, useFormStatus } from "react-dom";
import { updateVerificationStatusAction, UpdateStatusState } from "./actions";
import { Button } from "@/components/ui/Button";
import type { ProviderVerificationStatus } from "@motiq/types";

const STATUS_OPTIONS: ProviderVerificationStatus[] = [
  "UNVERIFIED",
  "PROVISIONAL",
  "FULLY_VERIFIED",
  "SUSPENDED",
  "DELISTED",
] as ProviderVerificationStatus[];

const initialState: UpdateStatusState = { error: null };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" disabled={pending}>
      {pending ? "Saving…" : "Set"}
    </Button>
  );
}

export function StatusForm({
  providerProfileId,
  currentStatus,
}: {
  providerProfileId: string;
  currentStatus: string;
}) {
  const action = updateVerificationStatusAction.bind(null, providerProfileId);
  const [state, formAction] = useFormState(action, initialState);

  return (
    <form action={formAction} className="flex items-center gap-2">
      <select
        name="status"
        defaultValue={currentStatus}
        className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-700 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
      >
        {STATUS_OPTIONS.map((status) => (
          <option key={status} value={status}>
            {status}
          </option>
        ))}
      </select>
      <SubmitButton />
      {state.error ? <span className="text-xs font-medium text-danger">{state.error}</span> : null}
    </form>
  );
}
