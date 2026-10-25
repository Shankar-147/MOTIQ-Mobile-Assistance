import Link from "next/link";
import { apiFetch } from "@/lib/api";
import { CreateServiceAreaForm } from "./create-form";
import { LaunchPhaseSelect } from "./launch-phase-select";
import { Table, Th, Td } from "@/components/ui/Table";
import { Card } from "@/components/ui/Card";

interface ServiceAreaRow {
  id: string;
  name: string;
  launchPhase: string;
}

export default async function ServiceAreasPage() {
  const serviceAreas = await apiFetch<ServiceAreaRow[]>("/service-areas");

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-slate-900">Service areas</h1>
      <p className="mt-1 max-w-3xl text-sm text-slate-500">
        Ch7&apos;s four-phase cold-start playbook — advancing a phase here is a real write, not cosmetic.
      </p>

      <div className="mt-6">
        <Table>
          <thead>
            <tr>
              <Th>Name</Th>
              <Th>ID</Th>
              <Th>Launch phase</Th>
              <Th>Pricing</Th>
            </tr>
          </thead>
          <tbody>
            {serviceAreas.map((area) => (
              <tr key={area.id}>
                <Td className="font-medium text-slate-900">{area.name}</Td>
                <Td className="font-mono text-xs">{area.id}</Td>
                <Td>
                  <LaunchPhaseSelect serviceAreaId={area.id} currentPhase={area.launchPhase} />
                </Td>
                <Td>
                  <Link href={`/service-areas/${area.id}`} className="font-medium text-primary hover:underline">
                    Configure
                  </Link>
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      </div>

      <Card className="mt-6">
        <CreateServiceAreaForm />
      </Card>
    </div>
  );
}
