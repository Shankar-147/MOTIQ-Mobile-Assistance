"use client";

import { useFormState, useFormStatus } from "react-dom";
import { createServiceAreaAction, FormState } from "./actions";

const initialState: FormState = { error: null };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-md bg-slate-900 px-3 py-1.5 text-sm text-white hover:bg-slate-700 disabled:opacity-50"
    >
      {pending ? "Creating…" : "Create service area"}
    </button>
  );
}

export function CreateServiceAreaForm() {
  const [state, formAction] = useFormState(createServiceAreaAction, initialState);
  return (
    <form action={formAction} className="flex items-end gap-2">
      <div>
        <label htmlFor="name" className="block text-xs font-medium text-slate-600">
          New service area name
        </label>
        <input
          id="name"
          name="name"
          required
          placeholder="e.g. Chennai (Pilot)"
          className="mt-1 rounded-md border border-slate-300 px-3 py-1.5 text-sm"
        />
      </div>
      <SubmitButton />
      {state.error ? <span className="text-xs text-red-600">{state.error}</span> : null}
    </form>
  );
}
