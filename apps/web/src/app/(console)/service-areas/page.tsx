import Link from "next/link";
import { apiFetch } from "@/lib/api";
import { CreateServiceAreaForm } from "./create-form";
import { LaunchPhaseSelect } from "./launch-phase-select";

interface ServiceAreaRow {
  id: string;
  name: string;
  launchPhase: string;
}

export default async function ServiceAreasPage() {
  const serviceAreas = await apiFetch<ServiceAreaRow[]>("/service-areas");

  return (
    <div>
      <h1 className="text-2xl font-semibold">Service areas</h1>
      <p className="mt-1 text-sm text-slate-600">
        Ch7's four-phase cold-start playbook — advancing a phase here is a real write, not cosmetic.
      </p>

      <div className="mt-6 overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-slate-500">
            <tr>
              <th className="px-4 py-2">Name</th>
              <th className="px-4 py-2">ID</th>
              <th className="px-4 py-2">Launch phase</th>
              <th className="px-4 py-2">Pricing</th>
            </tr>
          </thead>
          <tbody>
            {serviceAreas.map((area) => (
              <tr key={area.id} className="border-b border-slate-100 last:border-0">
                <td className="px-4 py-2">{area.name}</td>
                <td className="px-4 py-2 font-mono text-xs">{area.id}</td>
                <td className="px-4 py-2">
                  <LaunchPhaseSelect serviceAreaId={area.id} currentPhase={area.launchPhase} />
                </td>
                <td className="px-4 py-2">
                  <Link href={`/service-areas/${area.id}`} className="text-blue-600 underline">
                    Configure
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-6 rounded-lg border border-slate-200 bg-white p-4">
        <CreateServiceAreaForm />
      </div>
    </div>
  );
}
