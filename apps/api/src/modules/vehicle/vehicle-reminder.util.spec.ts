import { MaintenanceDueStatus, MaintenanceServiceType } from "@motiq/types";
import { MaintenanceDueRow } from "./maintenance-due.util";
import { shouldSendReminder } from "./vehicle-reminder.util";

function row(overrides: Partial<MaintenanceDueRow>): MaintenanceDueRow {
  return {
    serviceType: MaintenanceServiceType.OIL_CHANGE,
    status: MaintenanceDueStatus.OK,
    lastServicedAt: new Date(),
    lastOdometerKm: 10_000,
    intervalKm: 8_000,
    intervalMonths: 6,
    kmSinceService: 0,
    monthsSinceService: 0,
    ...overrides,
  };
}

describe("shouldSendReminder", () => {
  it("never reminds for OK or NOT_TRACKED", () => {
    expect(shouldSendReminder(row({ status: MaintenanceDueStatus.OK }), 7)).toBe(false);
    expect(shouldSendReminder(row({ status: MaintenanceDueStatus.NOT_TRACKED }), 7)).toBe(false);
  });

  it("always reminds when OVERDUE, regardless of lead time", () => {
    expect(shouldSendReminder(row({ status: MaintenanceDueStatus.OVERDUE }), 0)).toBe(true);
  });

  it("for a month-based rule, reminds once days-remaining is within the lead time", () => {
    // 6-month interval, 5.8 months since service -> 6 days remaining
    const dueRow = row({ status: MaintenanceDueStatus.DUE_SOON, intervalMonths: 6, monthsSinceService: 5.8 });
    expect(shouldSendReminder(dueRow, 7)).toBe(true); // 6 days remaining <= 7-day lead time
    expect(shouldSendReminder(dueRow, 3)).toBe(false); // 6 days remaining > 3-day lead time
  });

  it("for a km-only rule (no intervalMonths), falls back to the existing due-soon band", () => {
    const dueRow = row({
      status: MaintenanceDueStatus.DUE_SOON,
      intervalMonths: null,
      monthsSinceService: null,
      serviceType: MaintenanceServiceType.TIRE_ROTATION,
    });
    expect(shouldSendReminder(dueRow, 1)).toBe(true);
  });
});
