import { apiFetch } from "@/lib/api";
import { StatusForm } from "./status-form";
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
      <h1 className="text-2xl font-semibold">Providers</h1>
      <p className="mt-1 text-sm text-slate-600">
        Changing verification status here goes through the same guarded state machine as every other
        write path (Ch98, ADR 0016) — an invalid transition is rejected, not silently applied.
      </p>

      <div className="mt-6 overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-slate-500">
            <tr>
              <th className="px-4 py-2">Business</th>
              <th className="px-4 py-2">Phone</th>
              <th className="px-4 py-2">Presence</th>
              <th className="px-4 py-2">Trust score</th>
              <th className="px-4 py-2">Rating</th>
              <th className="px-4 py-2">Jobs</th>
              <th className="px-4 py-2">Verification status</th>
            </tr>
          </thead>
          <tbody>
            {result.data.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-slate-400">
                  No providers yet.
                </td>
              </tr>
            ) : (
              result.data.map((provider) => (
                <tr key={provider.id} className="border-b border-slate-100 last:border-0">
                  <td className="px-4 py-2">{provider.businessName}</td>
                  <td className="px-4 py-2">{provider.user.phone}</td>
                  <td className="px-4 py-2">{provider.presenceStatus}</td>
                  <td className="px-4 py-2">{provider.trustScore}</td>
                  <td className="px-4 py-2">{provider.ratingAverage}</td>
                  <td className="px-4 py-2">{provider.completedJobCount}</td>
                  <td className="px-4 py-2">
                    <StatusForm providerProfileId={provider.id} currentStatus={provider.verificationStatus} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {result.pagination.nextCursor ? (
        <a
          href={`/providers?cursor=${result.pagination.nextCursor}`}
          className="mt-4 inline-block text-sm text-blue-600 underline"
        >
          Next page
        </a>
      ) : null}
    </div>
  );
}
