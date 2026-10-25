import Link from "next/link";
import { Siren } from "@/lib/icons";
import { apiFetch } from "@/lib/api";
import { StatCard } from "@/components/ui/StatCard";
import { TrendChart } from "@/components/ui/Chart";
import { Card } from "@/components/ui/Card";
import { ActivityFeed } from "@/components/ui/ActivityFeed";
import type { PaginatedResult, SosAlertStatus } from "@motiq/types";

interface MetricsOverview {
  requestsByDay: { date: string; count: number }[];
  sosAlertsByDay: { date: string; count: number }[];
  providerGrowth: { date: string; cumulative: number }[];
}

export default async function DashboardPage() {
  const [pendingDocuments, serviceAreas, providers, sosAlerts, metrics] = await Promise.all([
    apiFetch<unknown[]>("/admin/providers/verification-documents"),
    apiFetch<unknown[]>("/service-areas"),
    apiFetch<PaginatedResult<unknown>>("/admin/providers?limit=1"),
    apiFetch<{ status: SosAlertStatus }[]>("/sos/alerts"),
    apiFetch<MetricsOverview>("/admin/metrics/overview?days=30"),
  ]);
  const activeSosCount = sosAlerts.filter((a) => a.status === "TRIGGERED" || a.status === "ACKNOWLEDGED").length;

  const first = metrics.providerGrowth[0]?.cumulative ?? 0;
  const last = metrics.providerGrowth[metrics.providerGrowth.length - 1]?.cumulative ?? 0;
  const percent = first === 0 ? 0 : Math.round(((last - first) / first) * 100);
  const providerTrend = { direction: (last >= first ? "up" : "down") as "up" | "down", percent: Math.abs(percent) };

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-slate-900">Dashboard</h1>
      <p className="mt-1 text-sm text-slate-500">Ch137&apos;s Admin &amp; Operations Console.</p>

      {activeSosCount > 0 ? (
        <Link
          href="/sos"
          className="mt-6 flex items-center gap-3 rounded-card border border-danger/20 bg-danger/5 p-4 font-semibold text-danger transition-colors hover:bg-danger/10"
        >
          <Siren size={20} strokeWidth={2} />
          {activeSosCount} active SOS alert{activeSosCount === 1 ? "" : "s"} — respond now →
        </Link>
      ) : null}

      <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard
          label="Active SOS alerts"
          value={activeSosCount}
          href="/sos"
          tone={activeSosCount > 0 ? "danger" : "default"}
        />
        <StatCard label="Pending KYC documents" value={pendingDocuments.length} href="/verifications" />
        <StatCard
          label="Providers"
          value={`${providers.data.length}${providers.pagination.nextCursor ? "+" : ""}`}
          href="/providers"
          trend={providerTrend}
        />
        <StatCard label="Service areas" value={serviceAreas.length} href="/service-areas" />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <p className="text-sm font-semibold text-slate-900">Requests (30d)</p>
          <TrendChart
            data={metrics.requestsByDay}
            series={[{ key: "count", label: "Requests", color: "#4F46E5" }]}
          />
        </Card>
        <Card>
          <p className="text-sm font-semibold text-slate-900">SOS alerts (30d)</p>
          <TrendChart
            data={metrics.sosAlertsByDay}
            series={[{ key: "count", label: "SOS alerts", color: "#dc2626" }]}
          />
        </Card>
        <Card>
          <p className="text-sm font-semibold text-slate-900">Provider growth (30d)</p>
          <TrendChart
            data={metrics.providerGrowth}
            series={[{ key: "cumulative", label: "Providers", color: "#14B8A6" }]}
          />
        </Card>
        <ActivityFeed />
      </div>
    </div>
  );
}
