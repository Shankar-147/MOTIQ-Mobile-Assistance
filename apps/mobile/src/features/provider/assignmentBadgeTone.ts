import { AssignmentStatus } from "@motiq/types";
import { BadgeTone } from "../../components/ui";

/** Shared Assignment status -> tone mapping so GoOnlineScreen's recent-jobs
 * strip and ProviderJobsScreen's full history render the same colors for the
 * same status, instead of two independently-invented palettes (mirrors
 * customer/statusBadgeTone.ts). */
export const ASSIGNMENT_STATUS_TONE: Record<AssignmentStatus, BadgeTone> = {
  [AssignmentStatus.OFFERED]: "warning",
  [AssignmentStatus.ACCEPTED]: "success",
  [AssignmentStatus.REJECTED]: "neutral",
  [AssignmentStatus.TIMED_OUT]: "neutral",
  // Ch61's admin manual dispatch override superseded this offer — the
  // provider it was offered to never actually declined it, so it reads the
  // same neutral tone as REJECTED/TIMED_OUT rather than implying a fault.
  [AssignmentStatus.SUPERSEDED]: "neutral",
};
