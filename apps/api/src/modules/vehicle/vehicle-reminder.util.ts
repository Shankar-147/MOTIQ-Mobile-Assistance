import { MaintenanceDueStatus } from "@motiq/types";
import { MaintenanceDueRow } from "./maintenance-due.util";

const DAYS_PER_MONTH = 30;

/**
 * VehicleReminderService's decision function — stated plainly rather than
 * faked: OVERDUE always reminds. For DUE_SOON on a rule with a month-based
 * interval, this projects days-remaining from monthsSinceService and only
 * fires once that's within the customer's leadTimeDays — so "remind me 1
 * week before" genuinely controls timing there. For a km-only rule (no
 * intervalMonths — e.g. tire rotation), there's no usage-rate data to
 * project a day count from, so it falls back to the existing percentage-band
 * DUE_SOON as-is (see maintenance-due.util.ts) rather than inventing one.
 */
export function shouldSendReminder(row: MaintenanceDueRow, leadTimeDays: number): boolean {
  if (row.status === MaintenanceDueStatus.OVERDUE) {
    return true;
  }
  if (row.status !== MaintenanceDueStatus.DUE_SOON) {
    return false;
  }
  if (row.intervalMonths != null && row.monthsSinceService != null) {
    const daysRemaining = (row.intervalMonths - row.monthsSinceService) * DAYS_PER_MONTH;
    return daysRemaining <= leadTimeDays;
  }
  // km-only rule — no day projection possible, honor the existing due-soon band.
  return true;
}
