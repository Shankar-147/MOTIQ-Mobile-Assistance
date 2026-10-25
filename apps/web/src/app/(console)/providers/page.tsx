import { apiFetch } from "@/lib/api";
import { StatusForm } from "./status-form";
import { Table, Th, Td } from "@/components/ui/Table";
import { Badge, statusTone } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import type { PaginatedResult } from "@motiq/types";

interface ProviderRow {
  id: string;
  businessName: string;
  verificationStatus: string;
  presenceStatus: string;
  trustScore: string;
  ratingAverage: string;
  completedJobCount: number;
  serviceAreaId: string;
  user: { phone: string };
}

export default async function ProvidersPage({
  searchParams,
}: {
  searchParams: { cursor?: string };
}) {
  const query = searchParams.cursor ? `?cursor=${searchParams.cursor}` : "";
  const result = await apiFetch<PaginatedResult<ProviderRow>>(`/admin/providers${query}`);

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-slate-900">Providers</h1>
      <p className="mt-1 max-w-3xl text-sm text-slate-500">
        Changing verification status here goes through the same guarded state machine as every other
        write path (Ch98, ADR 0016) — an invalid transition is rejected, not silently applied.
      </p>

      <div className="mt-6">
        {result.data.length === 0 ? (
          <EmptyState title="No providers yet" />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Business</Th>
                <Th>Phone</Th>
                <Th>Presence</Th>
                <Th>Trust score</Th>
                <Th>Rating</Th>
                <Th>Jobs</Th>
                <Th>Verification status</Th>
              </tr>
            </thead>
            <tbody>
              {result.data.map((provider) => (
                <tr key={provider.id}>
                  <Td className="font-medium text-slate-900">{provider.businessName}</Td>
                  <Td className="whitespace-nowrap">{provider.user.phone}</Td>
                  <Td>
                    <Badge tone={provider.presenceStatus === "ONLINE" ? "success" : "neutral"}>
                      {provider.presenceStatus}
                    </Badge>
                  </Td>
                  <Td>{provider.trustScore}</Td>
                  <Td>{provider.ratingAverage}</Td>
                  <Td>{provider.completedJobCount}</Td>
                  <Td>
                    <div className="flex items-center gap-2">
                      <Badge tone={statusTone(provider.verificationStatus)}>{provider.verificationStatus}</Badge>
                      <StatusForm providerProfileId={provider.id} currentStatus={provider.verificationStatus} />
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </div>

      {result.pagination.nextCursor ? (
        <a
          href={`/providers?cursor=${result.pagination.nextCursor}`}
          className="mt-4 inline-block text-sm font-medium text-primary hover:underline"
        >
          Next page →
        </a>
      ) : null}
    </div>
  );
}
