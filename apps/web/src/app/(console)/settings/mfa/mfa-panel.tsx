"use client";

import { useState, useTransition } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { startEnrollmentAction, confirmEnrollmentAction, disableMfaAction, ConfirmState } from "./actions";

const initialConfirmState: ConfirmState = { error: null, confirmed: false };

function ConfirmSubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-md bg-slate-900 px-3 py-1.5 text-sm text-white hover:bg-slate-700 disabled:opacity-50"
    >
      {pending ? "Confirming…" : "Confirm code"}
    </button>
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
        <p className="text-sm text-emerald-700">MFA is enabled on this account.</p>
        <form action={disableMfaAction} className="mt-3">
          <button
            type="submit"
            className="rounded-md bg-red-600 px-3 py-1.5 text-sm text-white hover:bg-red-500"
          >
            Disable MFA
          </button>
        </form>
      </div>
    );
  }

  if (confirmState.confirmed) {
    return <p className="text-sm text-emerald-700">MFA enabled — reload this page to confirm.</p>;
  }

  if (!enrollment) {
    return (
      <div>
        <p className="text-sm text-slate-600">MFA is not enabled on this account.</p>
        <button
          type="button"
          disabled={isPending}
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
          className="mt-3 rounded-md bg-slate-900 px-3 py-1.5 text-sm text-white hover:bg-slate-700 disabled:opacity-50"
        >
          {isPending ? "Starting…" : "Enroll in MFA"}
        </button>
        {enrollError ? <p className="mt-2 text-xs text-red-600">{enrollError}</p> : null}
      </div>
    );
  }

  return (
    <div>
      <p className="text-sm text-slate-600">
        Add this to your authenticator app (Google Authenticator, Authy, 1Password, etc.):
      </p>
      <p className="mt-2 rounded-md bg-slate-100 p-3 font-mono text-sm">{enrollment.secret}</p>
      <p className="mt-1 break-all text-xs text-slate-400">{enrollment.otpauthUri}</p>

      <form action={confirmAction} className="mt-4 flex items-end gap-2">
        <div>
          <label htmlFor="code" className="block text-xs font-medium text-slate-600">
            Enter the 6-digit code it generates
          </label>
          <input
            id="code"
            name="code"
            required
            maxLength={6}
            inputMode="numeric"
            className="mt-1 rounded-md border border-slate-300 px-3 py-1.5 text-sm"
          />
        </div>
        <ConfirmSubmitButton />
      </form>
      {confirmState.error ? <p className="mt-2 text-xs text-red-600">{confirmState.error}</p> : null}
    </div>
  );
}
