"use client";

import { useTransition } from "react";
import { SosAlertStatus } from "@motiq/types";
import { acknowledgeAlertAction, resolveAlertAction } from "./actions";
import { Button } from "@/components/ui/Button";

export function AlertActions({ alertId, status }: { alertId: string; status: SosAlertStatus }) {
  const [isPending, startTransition] = useTransition();

  if (status === SosAlertStatus.RESOLVED || status === SosAlertStatus.FALSE_ALARM) {
    return <span className="text-xs text-slate-400">Closed</span>;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {status === SosAlertStatus.TRIGGERED ? (
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={isPending}
          onClick={() => startTransition(() => acknowledgeAlertAction(alertId))}
        >
          Acknowledge
        </Button>
      ) : null}
      <Button
        type="button"
        variant="success"
        size="sm"
        disabled={isPending}
        onClick={() => startTransition(() => resolveAlertAction(alertId, SosAlertStatus.RESOLVED))}
      >
        Resolve
      </Button>
      <Button
        type="button"
        variant="secondary"
        size="sm"
        disabled={isPending}
        onClick={() => startTransition(() => resolveAlertAction(alertId, SosAlertStatus.FALSE_ALARM))}
      >
        False alarm
      </Button>
    </div>
  );
}
