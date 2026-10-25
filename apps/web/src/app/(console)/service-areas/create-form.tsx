"use client";

import { useFormState, useFormStatus } from "react-dom";
import { createServiceAreaAction, FormState } from "./actions";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Input";

const initialState: FormState = { error: null };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Creating…" : "Create service area"}
    </Button>
  );
}

export function CreateServiceAreaForm() {
  const [state, formAction] = useFormState(createServiceAreaAction, initialState);
  return (
    <form action={formAction} className="flex items-end gap-3">
      <div className="flex-1 max-w-xs">
        <Field htmlFor="name">New service area name</Field>
        <Input id="name" name="name" required placeholder="e.g. Chennai (Pilot)" />
      </div>
      <SubmitButton />
      {state.error ? <span className="text-xs font-medium text-danger">{state.error}</span> : null}
    </form>
  );
}
