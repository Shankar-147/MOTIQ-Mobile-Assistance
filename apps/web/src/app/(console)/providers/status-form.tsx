"use client";

import { useFormState, useFormStatus } from "react-dom";
import { updateVerificationStatusAction, UpdateStatusState } from "./actions";
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
    <button
      type="submit"
      disabled={pending}
      className="rounded-md bg-slate-800 px-3 py-1 text-sm text-white hover:bg-slate-700 disabled:opacity-50"
    >
      {pending ? "Saving…" : "Set"}
    </button>
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
        className="rounded-md border border-slate-300 px-2 py-1 text-sm"
      >
        {STATUS_OPTIONS.map((status) => (
          <option key={status} value={status}>
            {status}
          </option>
        ))}
      </select>
      <SubmitButton />
      {state.error ? <span className="text-xs text-red-600">{state.error}</span> : null}
    </form>
  );
}
