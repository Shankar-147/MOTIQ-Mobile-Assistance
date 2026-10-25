import { apiFetch } from "@/lib/api";
import { AlertActions } from "./alert-actions";
import { Table, Th, Td } from "@/components/ui/Table";
import { Badge, statusTone } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
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

export default async function SosPage() {
  const alerts = await apiFetch<SosAlertRow[]>("/sos/alerts");
  const active = alerts.filter((a) => a.status === "TRIGGERED" || a.status === "ACKNOWLEDGED");

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-slate-900">SOS alerts</h1>
      <p className="mt-1 max-w-3xl text-sm text-slate-500">
        Ch55&apos;s highest-priority path. {active.length} active alert{active.length === 1 ? "" : "s"} right
        now. This is an internal escalation to MOTIQ&apos;s own team — it does not call police/ambulance
        directly; the triggering user was told to contact real emergency services themselves.
      </p>

      <div className="mt-6">
        {alerts.length === 0 ? (
          <EmptyState title="No SOS alerts" body="Nothing has been triggered yet." />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>When</Th>
                <Th>Status</Th>
                <Th>Triggered by</Th>
                <Th>Source</Th>
                <Th>Location</Th>
                <Th>Service request</Th>
                <Th>Action</Th>
              </tr>
            </thead>
            <tbody>
              {alerts.map((alert) => (
                <tr
                  key={alert.id}
                  className={alert.status === "TRIGGERED" ? "border-l-4 border-l-danger bg-danger/5" : undefined}
                >
                  <Td className="whitespace-nowrap">{new Date(alert.createdAt).toLocaleString()}</Td>
                  <Td>
                    <Badge tone={statusTone(alert.status)}>{alert.status.replace("_", " ")}</Badge>
                  </Td>
                  <Td className="whitespace-nowrap">
                    {alert.triggeredByUser.phone} ({alert.triggeredByUser.role})
                  </Td>
                  <Td className="text-xs text-slate-500">{alert.source}</Td>
                  <Td className="whitespace-nowrap font-mono text-xs">
                    {alert.latitude !== null && alert.longitude !== null
                      ? `${alert.latitude.toFixed(5)}, ${alert.longitude.toFixed(5)}`
                      : "unknown"}
                  </Td>
                  <Td className="font-mono text-xs">{alert.serviceRequestId ?? "—"}</Td>
                  <Td>
                    <AlertActions alertId={alert.id} status={alert.status} />
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </div>
    </div>
  );
}
