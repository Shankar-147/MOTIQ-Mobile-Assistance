"use client";

import { useTransition } from "react";
import { advanceLaunchPhaseAction } from "./actions";
import type { ServiceAreaLaunchPhase } from "@motiq/types";

const PHASES: ServiceAreaLaunchPhase[] = [
  "SUPPLY_SEEDING",
  "CONTROLLED_DEMAND",
  "LIQUIDITY_GROWTH",
  "STEADY_STATE",
] as ServiceAreaLaunchPhase[];

export function LaunchPhaseSelect({
  serviceAreaId,
  currentPhase,
}: {
  serviceAreaId: string;
  currentPhase: string;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <select
      defaultValue={currentPhase}
      disabled={isPending}
      onChange={(event) =>
        startTransition(() =>
          advanceLaunchPhaseAction(serviceAreaId, event.target.value as ServiceAreaLaunchPhase),
        )
      }
      className="rounded-md border border-slate-300 px-2 py-1 text-sm"
    >
      {PHASES.map((phase) => (
        <option key={phase} value={phase}>
          {phase.replace(/_/g, " ")}
        </option>
      ))}
    </select>
  );
}
