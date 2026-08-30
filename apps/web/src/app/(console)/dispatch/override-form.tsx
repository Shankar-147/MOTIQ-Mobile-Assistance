"use client";

import { useFormState, useFormStatus } from "react-dom";
import { dispatchOverrideAction, DispatchOverrideState } from "./actions";

interface EligibleProvider {
  id: string;
  businessName: string;
  verificationStatus: string;
  presenceStatus: string;
}

const initialState: DispatchOverrideState = { error: null };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-md bg-slate-800 px-3 py-1.5 text-sm text-white hover:bg-slate-700 disabled:opacity-50"
    >
      {pending ? "Assigning…" : "Assign provider"}
    </button>
  );
}

export function OverrideForm({
  serviceRequestId,
  providers,
}: {
  serviceRequestId: string;
  providers: EligibleProvider[];
}) {
  const action = dispatchOverrideAction.bind(null, serviceRequestId);
  const [state, formAction] = useFormState(action, initialState);

  if (providers.length === 0) {
    return <p className="text-sm text-slate-400">No providers exist in this request&apos;s service area.</p>;
  }

  return (
    <form action={formAction} className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <select
        name="providerProfileId"
        required
        className="rounded-md border border-slate-300 px-2 py-1.5 text-sm"
        defaultValue=""
      >
        <option value="" disabled>
          Choose a provider…
        </option>
        {providers.map((provider) => (
          <option key={provider.id} value={provider.id}>
            {provider.businessName} — {provider.verificationStatus} — {provider.presenceStatus}
          </option>
        ))}
      </select>
      <input
        type="text"
        name="reason"
        placeholder="Reason (optional, for the audit log)"
        className="rounded-md border border-slate-300 px-2 py-1.5 text-sm sm:w-64"
      />
      <SubmitButton />
      {state.error ? <span className="text-xs text-red-600">{state.error}</span> : null}
    </form>
  );
}
