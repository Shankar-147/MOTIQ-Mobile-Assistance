"use client";

import { useFormState, useFormStatus } from "react-dom";
import { setFareConfigAction, setCommissionRateAction, FormState } from "../actions";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Input";

const initialState: FormState = { error: null };

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Saving…" : label}
    </Button>
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
          <Field>Base fare (INR)</Field>
          <Input name="baseFare" type="number" step="0.01" min="0" required defaultValue={current?.baseFare} />
        </div>
        <div>
          <Field>Per-km rate (INR)</Field>
          <Input name="perKmRate" type="number" step="0.01" min="0" required defaultValue={current?.perKmRate} />
        </div>
        <div>
          <Field>Max surge multiplier</Field>
          <Input
            name="maxSurgeMultiplier"
            type="number"
            step="0.1"
            min="1"
            defaultValue={current?.maxSurgeMultiplier}
          />
        </div>
      </div>
      <SubmitButton label="Set fare config" />
      {state.error ? <p className="text-xs font-medium text-danger">{state.error}</p> : null}
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
      <div className="max-w-xs">
        <Field>Commission rate (%)</Field>
        <Input
          name="ratePercentage"
          type="number"
          step="0.1"
          min="0"
          max="100"
          required
          defaultValue={current ?? undefined}
        />
      </div>
      <SubmitButton label="Set commission rate" />
      {state.error ? <span className="text-xs font-medium text-danger">{state.error}</span> : null}
    </form>
  );
}
