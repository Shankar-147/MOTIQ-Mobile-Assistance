import { MaintenanceDueStatus, MaintenanceServiceType } from "@motiq/types";
import { computeMaintenanceDueStatus } from "./maintenance-due.util";

describe("computeMaintenanceDueStatus", () => {
  const now = new Date("2026-06-01T00:00:00Z");
  const oilChangeRule = {
    serviceType: MaintenanceServiceType.OIL_CHANGE,
    intervalKm: 8000,
    intervalMonths: 6,
  };

  it("returns NOT_TRACKED when no record exists for that service type yet", () => {
    const [row] = computeMaintenanceDueStatus(10_000, [], [oilChangeRule], now);
    expect(row.status).toBe(MaintenanceDueStatus.NOT_TRACKED);
    expect(row.lastServicedAt).toBeNull();
  });

  it("returns OK when well within both the km and month interval", () => {
    const records = [
      { serviceType: MaintenanceServiceType.OIL_CHANGE, odometerKm: 9_000, servicedAt: new Date("2026-05-01T00:00:00Z") },
    ];
    const [row] = computeMaintenanceDueStatus(10_000, records, [oilChangeRule], now);
    expect(row.status).toBe(MaintenanceDueStatus.OK);
    expect(row.kmSinceService).toBe(1_000);
  });

  it("returns DUE_SOON when within the last 15% of the km interval", () => {
    // 8000km interval, 15% band starts at 6800km since service
    const records = [
      { serviceType: MaintenanceServiceType.OIL_CHANGE, odometerKm: 3_000, servicedAt: new Date("2026-05-15T00:00:00Z") },
    ];
    const [row] = computeMaintenanceDueStatus(10_000, records, [oilChangeRule], now);
    expect(row.status).toBe(MaintenanceDueStatus.DUE_SOON);
  });

  it("returns OVERDUE when past the km interval, even if within the month interval", () => {
    const records = [
      { serviceType: MaintenanceServiceType.OIL_CHANGE, odometerKm: 1_000, servicedAt: new Date("2026-05-15T00:00:00Z") },
    ];
    const [row] = computeMaintenanceDueStatus(10_000, records, [oilChangeRule], now);
    expect(row.status).toBe(MaintenanceDueStatus.OVERDUE);
  });

  it("returns OVERDUE when past the month interval, even if within the km interval", () => {
    const records = [
      { serviceType: MaintenanceServiceType.OIL_CHANGE, odometerKm: 9_500, servicedAt: new Date("2025-11-01T00:00:00Z") },
    ];
    const [row] = computeMaintenanceDueStatus(10_000, records, [oilChangeRule], now);
    expect(row.status).toBe(MaintenanceDueStatus.OVERDUE);
  });

  it("treats a null current odometer as unknown mileage, falling back to the month interval only", () => {
    const records = [
      { serviceType: MaintenanceServiceType.OIL_CHANGE, odometerKm: 9_500, servicedAt: new Date("2025-11-01T00:00:00Z") },
    ];
    const [row] = computeMaintenanceDueStatus(null, records, [oilChangeRule], now);
    expect(row.kmSinceService).toBeNull();
    expect(row.status).toBe(MaintenanceDueStatus.OVERDUE); // 7 months since service > 6-month interval
  });
});
