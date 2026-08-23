"use client";

import { useFormState, useFormStatus } from "react-dom";
import { setFareConfigAction, setCommissionRateAction, FormState } from "../actions";

const initialState: FormState = { error: null };

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-md bg-slate-900 px-3 py-1.5 text-sm text-white hover:bg-slate-700 disabled:opacity-50"
    >
      {pending ? "Saving…" : label}
    </button>
  );
}

export function FareConfigForm({
  serviceAreaId,
  current,
}: {
  serviceAreaId: string;
  current: { baseFare: string; perKmRate: string; maxSurgeMultiplier: string } | null;
}) {
  const [state, formAction] = useFormState(setFareConfigAction, initialState);
  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="serviceAreaId" value={serviceAreaId} />
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="block text-xs font-medium text-slate-600">Base fare (INR)</label>
          <input
            name="baseFare"
            type="number"
            step="0.01"
            min="0"
            required
            defaultValue={current?.baseFare}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600">Per-km rate (INR)</label>
          <input
            name="perKmRate"
            type="number"
            step="0.01"
            min="0"
            required
            defaultValue={current?.perKmRate}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600">Max surge multiplier</label>
          <input
            name="maxSurgeMultiplier"
            type="number"
            step="0.1"
            min="1"
            defaultValue={current?.maxSurgeMultiplier}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm"
          />
        </div>
      </div>
      <SubmitButton label="Set fare config" />
      {state.error ? <p className="text-xs text-red-600">{state.error}</p> : null}
    </form>
  );
}

export function CommissionRateForm({
  serviceAreaId,
  current,
}: {
  serviceAreaId: string;
  current: string | null;
}) {
  const [state, formAction] = useFormState(setCommissionRateAction, initialState);
  return (
    <form action={formAction} className="flex items-end gap-3">
      <input type="hidden" name="serviceAreaId" value={serviceAreaId} />
      <div>
        <label className="block text-xs font-medium text-slate-600">Commission rate (%)</label>
        <input
          name="ratePercentage"
          type="number"
          step="0.1"
          min="0"
          max="100"
          required
          defaultValue={current ?? undefined}
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm"
        />
      </div>
      <SubmitButton label="Set commission rate" />
      {state.error ? <span className="text-xs text-red-600">{state.error}</span> : null}
    </form>
  );
}
