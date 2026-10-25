import { apiFetch } from "@/lib/api";
import { Badge, statusTone } from "@/components/ui/Badge";
import type { PaginatedResult } from "@motiq/types";

interface AuditLogRow {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  createdAt: string;
  actorUser: { phone: string; role: string } | null;
}

export async function ActivityFeed() {
  const { data } = await apiFetch<PaginatedResult<AuditLogRow>>("/admin/audit-log?limit=8");

  return (
    <div className="rounded-card border border-slate-200/80 bg-surface shadow-card">
      <div className="border-b border-slate-100 px-5 py-4">
        <p className="text-sm font-semibold text-slate-900">Recent activity</p>
      </div>
      <div className="divide-y divide-slate-100">
        {data.length === 0 ? (
          <p className="px-5 py-6 text-sm text-slate-400">Nothing yet.</p>
        ) : (
          data.map((entry) => (
            <div key={entry.id} className="flex items-center justify-between gap-3 px-5 py-3">
              <div className="min-w-0">
                <p className="truncate text-sm text-slate-700">
                  {entry.actorUser ? entry.actorUser.phone : "system"}
                </p>
                <p className="text-xs text-slate-400">{new Date(entry.createdAt).toLocaleString()}</p>
              </div>
              <Badge tone={statusTone(entry.action)}>{entry.action.replace(/_/g, " ")}</Badge>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
