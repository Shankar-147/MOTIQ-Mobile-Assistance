import { apiFetch } from "@/lib/api";
import { AlertActions } from "./alert-actions";
import type { SosAlertStatus } from "@motiq/types";

interface SosAlertRow {
  id: string;
  status: SosAlertStatus;
  source: string;
  latitude: number | null;
  longitude: number | null;
  serviceRequestId: string | null;
  createdAt: string;
  triggeredByUser: { phone: string; role: string };
}

const STATUS_BADGE: Record<string, string> = {
  TRIGGERED: "bg-red-100 text-red-800",
  ACKNOWLEDGED: "bg-amber-100 text-amber-800",
  RESOLVED: "bg-emerald-100 text-emerald-800",
  FALSE_ALARM: "bg-slate-100 text-slate-600",
};

export default async function SosPage() {
  const alerts = await apiFetch<SosAlertRow[]>("/sos/alerts");
  const active = alerts.filter((a) => a.status === "TRIGGERED" || a.status === "ACKNOWLEDGED");

  return (
    <div>
      <h1 className="text-2xl font-semibold">SOS alerts</h1>
      <p className="mt-1 text-sm text-slate-600">
        Ch55's highest-priority path. {active.length} active alert{active.length === 1 ? "" : "s"} right
        now. This is an internal escalation to MOTIQ's own team — it does not call police/ambulance
        directly; the triggering user was told to contact real emergency services themselves.
      </p>

      <div className="mt-6 overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-slate-500">
            <tr>
              <th className="px-4 py-2">When</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2">Triggered by</th>
              <th className="px-4 py-2">Source</th>
              <th className="px-4 py-2">Location</th>
              <th className="px-4 py-2">Service request</th>
              <th className="px-4 py-2">Action</th>
            </tr>
          </thead>
          <tbody>
            {alerts.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-slate-400">
                  No SOS alerts.
                </td>
              </tr>
            ) : (
              alerts.map((alert) => (
                <tr key={alert.id} className="border-b border-slate-100 last:border-0">
                  <td className="whitespace-nowrap px-4 py-2">{new Date(alert.createdAt).toLocaleString()}</td>
                  <td className="px-4 py-2">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[alert.status]}`}>
                      {alert.status.replace("_", " ")}
                    </span>
                  </td>
                  <td className="px-4 py-2">
                    {alert.triggeredByUser.phone} ({alert.triggeredByUser.role})
                  </td>
                  <td className="px-4 py-2 text-xs text-slate-500">{alert.source}</td>
                  <td className="px-4 py-2 font-mono text-xs">
                    {alert.latitude !== null && alert.longitude !== null
                      ? `${alert.latitude.toFixed(5)}, ${alert.longitude.toFixed(5)}`
                      : "unknown"}
                  </td>
                  <td className="px-4 py-2 font-mono text-xs">{alert.serviceRequestId ?? "—"}</td>
                  <td className="px-4 py-2">
                    <AlertActions alertId={alert.id} status={alert.status} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
