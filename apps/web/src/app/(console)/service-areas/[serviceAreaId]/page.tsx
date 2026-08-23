import { apiFetch, ApiError } from "@/lib/api";
import { FareConfigForm, CommissionRateForm } from "./forms";

interface ServiceAreaRow {
  id: string;
  name: string;
}

interface FareConfigRow {
  baseFare: string;
  perKmRate: string;
  maxSurgeMultiplier: string;
}

interface CommissionRateRow {
  ratePercentage: string;
}

async function fetchOrNull<T>(path: string): Promise<T | null> {
  try {
    return await apiFetch<T>(path);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      return null;
    }
    throw error;
  }
}

export default async function ServiceAreaPricingPage({
  params,
}: {
  params: { serviceAreaId: string };
}) {
  const [serviceArea, fareConfig, commissionRate] = await Promise.all([
    apiFetch<ServiceAreaRow>(`/service-areas/${params.serviceAreaId}`),
    fetchOrNull<FareConfigRow>(`/service-areas/${params.serviceAreaId}/fare-config`),
    fetchOrNull<CommissionRateRow>(`/service-areas/${params.serviceAreaId}/commission-rate`),
  ]);

  return (
    <div>
      <h1 className="text-2xl font-semibold">{serviceArea.name} — pricing</h1>
      <p className="mt-1 text-sm text-slate-600">
        Ch34's binding rule: fare and commission are database configuration, never code constants.
        Setting a new value here creates a new effective-dated row (ADR 0003/0012) — it never
        overwrites history.
      </p>

      <section className="mt-6 rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-slate-700">Fare config</h2>
        {!fareConfig ? (
          <p className="mt-1 text-xs text-amber-600">
            No fare config set yet — requests in this service area cannot be priced until one exists.
          </p>
        ) : null}
        <div className="mt-3">
          <FareConfigForm
            serviceAreaId={params.serviceAreaId}
            current={
              fareConfig
                ? {
                    baseFare: fareConfig.baseFare,
                    perKmRate: fareConfig.perKmRate,
                    maxSurgeMultiplier: fareConfig.maxSurgeMultiplier,
                  }
                : null
            }
          />
        </div>
      </section>

      <section className="mt-6 rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-slate-700">Commission rate</h2>
        {!commissionRate ? (
          <p className="mt-1 text-xs text-amber-600">
            No commission rate set yet — payment settlement cannot compute a split until one exists.
          </p>
        ) : null}
        <div className="mt-3">
          <CommissionRateForm
            serviceAreaId={params.serviceAreaId}
            current={commissionRate?.ratePercentage ?? null}
          />
        </div>
      </section>
    </div>
  );
}
