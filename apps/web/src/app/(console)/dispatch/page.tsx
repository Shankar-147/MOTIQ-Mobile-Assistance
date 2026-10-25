import { apiFetch } from "@/lib/api";
import { OverrideForm } from "./override-form";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import type { PaginatedResult } from "@motiq/types";

interface RequestNeedingDispatch {
  id: string;
  serviceAreaId: string;
  issueType: string;
  status: string;
  vehicleSnapshotMake: string;
  vehicleSnapshotModel: string;
  vehicleSnapshotPlateNumber: string;
  createdAt: string;
}

interface ProviderRow {
  id: string;
  businessName: string;
  verificationStatus: string;
  presenceStatus: string;
  serviceAreaId: string;
}

/** Ch61/Ch137's admin manual-dispatch queue — requests automated matching
 * either hasn't resolved yet (MATCHING) or gave up on (EXPIRED,
 * "no_provider_available"). Every guard (same-city, verification
 * eligibility) is enforced server-side in
 * MatchingService.adminOverrideDispatch() — this page is just the picker. */
export default async function DispatchPage({
  searchParams,
}: {
  searchParams: { cursor?: string };
}) {
  const query = searchParams.cursor ? `?cursor=${searchParams.cursor}` : "";
  const result = await apiFetch<PaginatedResult<RequestNeedingDispatch>>(`/admin/requests/needing-dispatch${query}`);

  const requestsWithProviders = await Promise.all(
    result.data.map(async (request) => {
      const providers = await apiFetch<PaginatedResult<ProviderRow>>(
        `/admin/providers?serviceAreaId=${request.serviceAreaId}`,
      );
      return { request, providers: providers.data };
    }),
  );

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-slate-900">Dispatch queue</h1>
      <p className="mt-1 max-w-3xl text-sm text-slate-500">
        Requests automated matching hasn&apos;t resolved (MATCHING) or gave up on (EXPIRED). Assigning a
        provider here is immediately binding — no offer/response phase — and goes through the exact same
        same-city and verification-eligibility guards as automatic dispatch.
      </p>

      <div className="mt-6 flex flex-col gap-3">
        {requestsWithProviders.length === 0 ? (
          <EmptyState title="Nothing needs manual dispatch right now" />
        ) : (
          requestsWithProviders.map(({ request, providers }) => (
            <Card key={request.id} className="transition-all hover:-translate-y-0.5 hover:shadow-card-hover">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold capitalize text-slate-900">
                    {request.issueType.replace(/_/g, " ")}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {request.vehicleSnapshotMake} {request.vehicleSnapshotModel} ·{" "}
                    {request.vehicleSnapshotPlateNumber} · {new Date(request.createdAt).toLocaleString()}
                  </p>
                </div>
                <Badge tone="warning">{request.status}</Badge>
              </div>
              <div className="mt-4">
                <OverrideForm serviceRequestId={request.id} providers={providers} />
              </div>
            </Card>
          ))
        )}
      </div>

      {result.pagination.nextCursor ? (
        <a
          href={`/dispatch?cursor=${result.pagination.nextCursor}`}
          className="mt-4 inline-block text-sm font-medium text-primary hover:underline"
        >
          Next page →
        </a>
      ) : null}
    </div>
  );
}
