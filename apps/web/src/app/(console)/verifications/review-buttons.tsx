"use client";

import { useTransition } from "react";
import { reviewDocumentAction } from "./actions";
import { Button } from "@/components/ui/Button";

export function ReviewButtons({ documentId }: { documentId: string }) {
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex gap-2">
      <Button
        type="button"
        variant="success"
        size="sm"
        disabled={isPending}
        onClick={() => startTransition(() => reviewDocumentAction(documentId, "APPROVED"))}
      >
        Approve
      </Button>
      <Button
        type="button"
        variant="danger"
        size="sm"
        disabled={isPending}
        onClick={() => startTransition(() => reviewDocumentAction(documentId, "REJECTED"))}
      >
        Reject
      </Button>
    </div>
  );
}
