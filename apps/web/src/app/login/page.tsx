"use client";

import { useFormState, useFormStatus } from "react-dom";
import { ShieldCheck } from "@/lib/icons";
import { loginAction, LoginState } from "./actions";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Input";

const initialState: LoginState = { error: null };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full">
      {pending ? "Signing in…" : "Sign in"}
    </Button>
  );
}

export default function LoginPage() {
  const [state, formAction] = useFormState(loginAction, initialState);

  return (
    <main className="flex min-h-screen items-center justify-center bg-tint px-6">
      <div className="w-full max-w-sm rounded-card border border-slate-200/80 bg-surface p-8 shadow-card">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-50 text-primary">
          <ShieldCheck size={24} strokeWidth={2} />
        </div>
        <h1 className="mt-5 font-display text-2xl font-bold text-slate-900">MOTIQ Admin Console</h1>
        <p className="mt-1 text-sm text-slate-500">Admin / Support sign-in.</p>

        <form action={formAction} className="mt-6 space-y-4">
          <div>
            <Field htmlFor="identifier">Phone or email</Field>
            <Input id="identifier" name="identifier" type="text" required placeholder="you@motiq.dev" />
          </div>
          <div>
            <Field htmlFor="password">Password</Field>
            <Input id="password" name="password" type="password" required placeholder="••••••••" />
          </div>
          <div>
            <Field htmlFor="totpCode">
              Authenticator code <span className="font-normal text-slate-400">(only if MFA is enabled)</span>
            </Field>
            <Input id="totpCode" name="totpCode" type="text" inputMode="numeric" maxLength={6} placeholder="123456" />
          </div>

          {state.error ? (
            <p className="rounded-xl bg-danger/10 px-3 py-2 text-sm font-medium text-danger">{state.error}</p>
          ) : null}

          <SubmitButton />
        </form>
      </div>
    </main>
  );
}
