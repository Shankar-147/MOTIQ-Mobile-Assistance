import Link from "next/link";
import { apiFetch } from "@/lib/api";
import type { PaginatedResult, SosAlertStatus } from "@motiq/types";

export default async function DashboardPage() {
  const pendingDocuments = await apiFetch<unknown[]>("/admin/providers/verification-documents");
  const serviceAreas = await apiFetch<unknown[]>("/service-areas");
  const providers = await apiFetch<PaginatedResult<unknown>>("/admin/providers?limit=1");
  const sosAlerts = await apiFetch<{ status: SosAlertStatus }[]>("/sos/alerts");
  const activeSosCount = sosAlerts.filter((a) => a.status === "TRIGGERED" || a.status === "ACKNOWLEDGED").length;

  return (
    <div>
      <h1 className="text-2xl font-semibold">Dashboard</h1>
      <p className="mt-1 text-sm text-slate-600">Ch137's Admin & Operations Console.</p>

      {activeSosCount > 0 ? (
        <Link
          href="/sos"
          className="mt-6 block rounded-lg border-2 border-red-500 bg-red-50 p-4 font-medium text-red-800 hover:bg-red-100"
        >
          {activeSosCount} active SOS alert{activeSosCount === 1 ? "" : "s"} — respond now →
        </Link>
      ) : null}

      <div className="mt-6 grid grid-cols-4 gap-4">
        <Link href="/sos" className="rounded-lg border border-slate-200 bg-white p-4 hover:border-slate-400">
          <p className="text-sm text-slate-500">Active SOS alerts</p>
          <p className="mt-1 text-3xl font-semibold">{activeSosCount}</p>
        </Link>
        <Link
          href="/verifications"
          className="rounded-lg border border-slate-200 bg-white p-4 hover:border-slate-400"
        >
          <p className="text-sm text-slate-500">Pending KYC documents</p>
          <p className="mt-1 text-3xl font-semibold">{pendingDocuments.length}</p>
        </Link>
        <Link
          href="/providers"
          className="rounded-lg border border-slate-200 bg-white p-4 hover:border-slate-400"
        >
          <p className="text-sm text-slate-500">Providers</p>
          <p className="mt-1 text-3xl font-semibold">
            {providers.data.length}
            {providers.pagination.nextCursor ? "+" : ""}
          </p>
        </Link>
        <Link
          href="/service-areas"
          className="rounded-lg border border-slate-200 bg-white p-4 hover:border-slate-400"
        >
          <p className="text-sm text-slate-500">Service areas</p>
          <p className="mt-1 text-3xl font-semibold">{serviceAreas.length}</p>
        </Link>
      </div>
    </div>
  );
}
