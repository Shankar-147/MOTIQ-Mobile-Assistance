import { apiFetch } from "@/lib/api";
import { MfaPanel } from "./mfa-panel";

export default async function MfaSettingsPage() {
  const { mfaEnabled } = await apiFetch<{ mfaEnabled: boolean }>("/auth/admin/mfa");

  return (
    <div className="max-w-lg">
      <h1 className="text-2xl font-semibold">MFA settings</h1>
      <p className="mt-1 text-sm text-slate-600">
        Ch93's opt-in TOTP second factor — RFC 6238, works with any standard authenticator app.
      </p>

      <div className="mt-6 rounded-lg border border-slate-200 bg-white p-4">
        <MfaPanel mfaEnabled={mfaEnabled} />
      </div>
    </div>
  );
}
