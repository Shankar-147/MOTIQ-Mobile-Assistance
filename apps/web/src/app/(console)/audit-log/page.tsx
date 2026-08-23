import { apiFetch } from "@/lib/api";
import type { PaginatedResult } from "@motiq/types";

interface AuditLogRow {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  actorUser: { phone: string; role: string } | null;
}

export default async function AuditLogPage({
  searchParams,
}: {
  searchParams: { cursor?: string };
}) {
  const query = searchParams.cursor ? `?cursor=${searchParams.cursor}` : "";
  const result = await apiFetch<PaginatedResult<AuditLogRow>>(`/admin/audit-log${query}`);

  return (
    <div>
      <h1 className="text-2xl font-semibold">Audit log</h1>
      <p className="mt-1 text-sm text-slate-600">
        Wired to KYC document review, verification-tier changes, and lapsed-verification de-listing
        (Phase 4/7). Commission-rate changes are not yet audit-logged — a known gap, not silently
        assumed covered.
      </p>

      <div className="mt-6 overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-slate-500">
            <tr>
              <th className="px-4 py-2">When</th>
              <th className="px-4 py-2">Actor</th>
              <th className="px-4 py-2">Action</th>
              <th className="px-4 py-2">Entity</th>
              <th className="px-4 py-2">Metadata</th>
            </tr>
          </thead>
          <tbody>
            {result.data.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-slate-400">
                  No audit log entries yet.
                </td>
              </tr>
            ) : (
              result.data.map((entry) => (
                <tr key={entry.id} className="border-b border-slate-100 last:border-0 align-top">
                  <td className="whitespace-nowrap px-4 py-2">{new Date(entry.createdAt).toLocaleString()}</td>
                  <td className="px-4 py-2">
                    {entry.actorUser ? `${entry.actorUser.phone} (${entry.actorUser.role})` : "system"}
                  </td>
                  <td className="px-4 py-2 font-mono text-xs">{entry.action}</td>
                  <td className="px-4 py-2 font-mono text-xs">
                    {entry.entityType} / {entry.entityId}
                  </td>
                  <td className="px-4 py-2 font-mono text-xs text-slate-500">
                    {entry.metadata ? JSON.stringify(entry.metadata) : "—"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {result.pagination.nextCursor ? (
        <a
          href={`/audit-log?cursor=${result.pagination.nextCursor}`}
          className="mt-4 inline-block text-sm text-blue-600 underline"
        >
          Next page
        </a>
      ) : null}
    </div>
  );
}
