import { RequestStatus } from "@motiq/types";
import { BadgeTone } from "../../components/ui";

const TONE_MAP: Partial<Record<RequestStatus, BadgeTone>> = {
  [RequestStatus.COMPLETED]: "success",
  [RequestStatus.CANCELLED_BY_CUSTOMER]: "neutral",
  [RequestStatus.CANCELLED_BY_PROVIDER]: "neutral",
  [RequestStatus.EXPIRED]: "neutral",
  [RequestStatus.FAILED]: "danger",
};

/** Shared status→tone mapping so History and Detail render the same colors
 * for the same status instead of two independently-invented palettes. */
export function statusBadgeTone(status: RequestStatus): BadgeTone {
  return TONE_MAP[status] ?? "info";
}
