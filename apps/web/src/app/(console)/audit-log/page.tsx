import { apiFetch } from "@/lib/api";
import { Table, Th, Td } from "@/components/ui/Table";
import { EmptyState } from "@/components/ui/EmptyState";
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
      <h1 className="font-display text-2xl font-bold text-slate-900">Audit log</h1>
      <p className="mt-1 max-w-3xl text-sm text-slate-500">
        Wired to KYC document review, verification-tier changes, and lapsed-verification de-listing
        (Phase 4/7). Commission-rate changes are not yet audit-logged — a known gap, not silently
        assumed covered.
      </p>

      <div className="mt-6">
        {result.data.length === 0 ? (
          <EmptyState title="No audit log entries yet" />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>When</Th>
                <Th>Actor</Th>
                <Th>Action</Th>
                <Th>Entity</Th>
                <Th>Metadata</Th>
              </tr>
            </thead>
            <tbody>
              {result.data.map((entry) => (
                <tr key={entry.id} className="align-top">
                  <Td className="whitespace-nowrap">{new Date(entry.createdAt).toLocaleString()}</Td>
                  <Td className="whitespace-nowrap">
                    {entry.actorUser ? `${entry.actorUser.phone} (${entry.actorUser.role})` : "system"}
                  </Td>
                  <Td className="whitespace-nowrap font-mono text-xs">{entry.action}</Td>
                  <Td className="whitespace-nowrap font-mono text-xs">
                    {entry.entityType} / {entry.entityId}
                  </Td>
                  <Td className="min-w-[220px] font-mono text-xs text-slate-500">
                    {entry.metadata ? JSON.stringify(entry.metadata) : "—"}
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </div>

      {result.pagination.nextCursor ? (
        <a
          href={`/audit-log?cursor=${result.pagination.nextCursor}`}
          className="mt-4 inline-block text-sm font-medium text-primary hover:underline"
        >
          Next page →
        </a>
      ) : null}
    </div>
  );
}
