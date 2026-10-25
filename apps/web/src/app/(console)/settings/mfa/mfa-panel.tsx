"use client";

import { useState, useTransition } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { startEnrollmentAction, confirmEnrollmentAction, disableMfaAction, ConfirmState } from "./actions";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Input";

const initialConfirmState: ConfirmState = { error: null, confirmed: false };

function ConfirmSubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Confirming…" : "Confirm code"}
    </Button>
  );
}

export function MfaPanel({ mfaEnabled }: { mfaEnabled: boolean }) {
  const [enrollment, setEnrollment] = useState<{ secret: string; otpauthUri: string } | null>(null);
  const [enrollError, setEnrollError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [confirmState, confirmAction] = useFormState(confirmEnrollmentAction, initialConfirmState);

  if (mfaEnabled) {
    return (
      <div>
        <p className="text-sm font-medium text-success">MFA is enabled on this account.</p>
        <form action={disableMfaAction} className="mt-3">
          <Button type="submit" variant="danger">
            Disable MFA
          </Button>
        </form>
      </div>
    );
  }

  if (confirmState.confirmed) {
    return <p className="text-sm font-medium text-success">MFA enabled — reload this page to confirm.</p>;
  }

  if (!enrollment) {
    return (
      <div>
        <p className="text-sm text-slate-500">MFA is not enabled on this account.</p>
        <Button
          type="button"
          disabled={isPending}
          className="mt-3"
          onClick={() =>
            startTransition(async () => {
              const result = await startEnrollmentAction();
              if (result.error) {
                setEnrollError(result.error);
              } else {
                setEnrollment({ secret: result.secret!, otpauthUri: result.otpauthUri! });
              }
            })
          }
        >
          {isPending ? "Starting…" : "Enroll in MFA"}
        </Button>
        {enrollError ? <p className="mt-2 text-xs font-medium text-danger">{enrollError}</p> : null}
      </div>
    );
  }

  return (
    <div>
      <p className="text-sm text-slate-500">
        Add this to your authenticator app (Google Authenticator, Authy, 1Password, etc.):
      </p>
      <p className="mt-2 rounded-xl bg-slate-100 p-3 font-mono text-sm">{enrollment.secret}</p>
      <p className="mt-1 break-all text-xs text-slate-400">{enrollment.otpauthUri}</p>

      <form action={confirmAction} className="mt-4 flex items-end gap-3">
        <div>
          <Field htmlFor="code">Enter the 6-digit code it generates</Field>
          <Input id="code" name="code" required maxLength={6} inputMode="numeric" placeholder="123456" />
        </div>
        <ConfirmSubmitButton />
      </form>
      {confirmState.error ? <p className="mt-2 text-xs font-medium text-danger">{confirmState.error}</p> : null}
    </div>
  );
}
