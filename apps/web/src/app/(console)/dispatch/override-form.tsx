"use client";

import { useFormState, useFormStatus } from "react-dom";
import { dispatchOverrideAction, DispatchOverrideState } from "./actions";
import { Button } from "@/components/ui/Button";

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
    <Button type="submit" size="sm" disabled={pending}>
      {pending ? "Assigning…" : "Assign provider"}
    </Button>
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

  const fieldClasses =
    "rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-sm text-slate-700 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20";

  return (
    <form action={formAction} className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <select name="providerProfileId" required className={fieldClasses} defaultValue="">
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
        className={`${fieldClasses} sm:w-64`}
      />
      <SubmitButton />
      {state.error ? <span className="text-xs font-medium text-danger">{state.error}</span> : null}
    </form>
  );
}
