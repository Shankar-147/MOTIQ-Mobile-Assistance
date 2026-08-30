import { apiFetch } from "@/lib/api";
import { OverrideForm } from "./override-form";
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
      <h1 className="text-2xl font-semibold">Dispatch queue</h1>
      <p className="mt-1 text-sm text-slate-600">
        Requests automated matching hasn&apos;t resolved (MATCHING) or gave up on (EXPIRED). Assigning a
        provider here is immediately binding — no offer/response phase — and goes through the exact same
        same-city and verification-eligibility guards as automatic dispatch.
      </p>

      <div className="mt-6 flex flex-col gap-4">
        {requestsWithProviders.length === 0 ? (
          <p className="text-sm text-slate-400">Nothing needs manual dispatch right now.</p>
        ) : (
          requestsWithProviders.map(({ request, providers }) => (
            <div key={request.id} className="rounded-lg border border-slate-200 bg-white p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold capitalize">{request.issueType.replace(/_/g, " ")}</p>
                  <p className="text-xs text-slate-500">
                    {request.vehicleSnapshotMake} {request.vehicleSnapshotModel} ·{" "}
                    {request.vehicleSnapshotPlateNumber} · {new Date(request.createdAt).toLocaleString()}
                  </p>
                </div>
                <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600">
                  {request.status}
                </span>
              </div>
              <div className="mt-3">
                <OverrideForm serviceRequestId={request.id} providers={providers} />
              </div>
            </div>
          ))
        )}
      </div>

      {result.pagination.nextCursor ? (
        <a
          href={`/dispatch?cursor=${result.pagination.nextCursor}`}
          className="mt-4 inline-block text-sm text-blue-600 underline"
        >
          Next page
        </a>
      ) : null}
    </div>
  );
}
