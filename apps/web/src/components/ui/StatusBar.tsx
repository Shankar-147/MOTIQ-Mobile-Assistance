import Link from "next/link";
import { Siren, Radar, CheckCircle2 } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/cn";
import type { PaginatedResult, SosAlertStatus } from "@motiq/types";

interface Metrics {
  activeSos: number;
  dispatchBacklog: number;
}

async function loadMetrics(): Promise<Metrics | null> {
  try {
    const [sosAlerts, dispatch] = await Promise.all([
      apiFetch<{ status: SosAlertStatus }[]>("/sos/alerts"),
      apiFetch<PaginatedResult<unknown>>("/admin/requests/needing-dispatch?limit=1"),
    ]);
    const activeSos = sosAlerts.filter((a) => a.status === "TRIGGERED" || a.status === "ACKNOWLEDGED").length;
    const dispatchBacklog = dispatch.data.length + (dispatch.pagination.nextCursor ? 1 : 0);
    return { activeSos, dispatchBacklog };
  } catch (error) {
    // A Next.js redirect() (e.g. an expired session inside apiFetch) throws
    // its own control-flow error — never swallow that, or the user never
    // gets sent back to /login. Everything else (API down, network error)
    // degrades to "unavailable" instead of taking every page down with it,
    // since this bar renders on every authenticated page.
    if (error && typeof error === "object" && "digest" in error && String(error.digest).startsWith("NEXT_REDIRECT")) {
      throw error;
    }
    return null;
  }
}

export async function StatusBar() {
  const metrics = await loadMetrics();

  if (!metrics) {
    return (
      <div className="flex items-center gap-2 border-b border-slate-200/80 bg-slate-50 px-6 py-2 text-xs font-medium text-slate-400">
        Status unavailable
      </div>
    );
  }

  const { activeSos, dispatchBacklog } = metrics;
  const urgent = activeSos > 0;
  const warn = !urgent && dispatchBacklog > 0;

  return (
    <div
      className={cn(
        "flex items-center gap-6 border-b px-6 py-2 text-xs font-semibold transition-colors",
        urgent && "animate-pulse border-danger/30 bg-danger/10 text-danger",
        warn && "border-warning/30 bg-warning/10 text-warning",
        !urgent && !warn && "border-success/20 bg-success/5 text-success",
      )}
    >
      <Link href="/sos" className="flex items-center gap-1.5 hover:underline">
        <Siren size={14} strokeWidth={2} />
        {activeSos > 0 ? `${activeSos} active SOS alert${activeSos === 1 ? "" : "s"}` : "No active SOS alerts"}
      </Link>
      <Link href="/dispatch" className="flex items-center gap-1.5 hover:underline">
        <Radar size={14} strokeWidth={2} />
        {dispatchBacklog > 0 ? `${dispatchBacklog} in dispatch queue` : "Dispatch queue clear"}
      </Link>
      {!urgent && !warn ? (
        <span className="flex items-center gap-1.5">
          <CheckCircle2 size={14} strokeWidth={2} />
          All clear
        </span>
      ) : null}
    </div>
  );
}
