"use client";

import { useTransition } from "react";
import { SosAlertStatus } from "@motiq/types";
import { acknowledgeAlertAction, resolveAlertAction } from "./actions";

export function AlertActions({ alertId, status }: { alertId: string; status: SosAlertStatus }) {
  const [isPending, startTransition] = useTransition();

  if (status === SosAlertStatus.RESOLVED || status === SosAlertStatus.FALSE_ALARM) {
    return <span className="text-xs text-slate-400">Closed</span>;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {status === SosAlertStatus.TRIGGERED ? (
        <button
          type="button"
          disabled={isPending}
          onClick={() => startTransition(() => acknowledgeAlertAction(alertId))}
          className="rounded-md bg-amber-500 px-3 py-1 text-sm font-medium text-white hover:bg-amber-400 disabled:opacity-50"
        >
          Acknowledge
        </button>
      ) : null}
      <button
        type="button"
        disabled={isPending}
        onClick={() => startTransition(() => resolveAlertAction(alertId, SosAlertStatus.RESOLVED))}
        className="rounded-md bg-emerald-600 px-3 py-1 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
      >
        Resolve
      </button>
      <button
        type="button"
        disabled={isPending}
        onClick={() => startTransition(() => resolveAlertAction(alertId, SosAlertStatus.FALSE_ALARM))}
        className="rounded-md bg-slate-500 px-3 py-1 text-sm font-medium text-white hover:bg-slate-400 disabled:opacity-50"
      >
        False alarm
      </button>
    </div>
  );
}
