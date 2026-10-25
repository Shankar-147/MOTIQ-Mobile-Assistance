import { apiFetch } from "@/lib/api";
import { MfaPanel } from "./mfa-panel";
import { Card } from "@/components/ui/Card";

export default async function MfaSettingsPage() {
  const { mfaEnabled } = await apiFetch<{ mfaEnabled: boolean }>("/auth/admin/mfa");

  return (
    <div className="max-w-lg">
      <h1 className="font-display text-2xl font-bold text-slate-900">MFA settings</h1>
      <p className="mt-1 text-sm text-slate-500">
        Ch93&apos;s opt-in TOTP second factor — RFC 6238, works with any standard authenticator app.
      </p>

      <Card className="mt-6">
        <MfaPanel mfaEnabled={mfaEnabled} />
      </Card>
    </div>
  );
}
