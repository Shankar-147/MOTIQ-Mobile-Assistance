import { MaintenanceDueStatus, MaintenanceServiceType } from "@motiq/types";

/** DUE_SOON is the last 15% of whichever interval (km or months) applies —
 * a warning band before OVERDUE, not a separate hard threshold. */
const DUE_SOON_FRACTION = 0.15;
const MS_PER_MONTH = 30 * 24 * 60 * 60 * 1000;

export interface MaintenanceRecordLike {
  serviceType: MaintenanceServiceType;
  odometerKm: number;
  servicedAt: Date;
}

export interface MaintenanceIntervalRuleLike {
  serviceType: MaintenanceServiceType;
  intervalKm: number | null;
  intervalMonths: number | null;
}

export interface MaintenanceDueRow {
  serviceType: MaintenanceServiceType;
  status: MaintenanceDueStatus;
  lastServicedAt: Date | null;
  lastOdometerKm: number | null;
  intervalKm: number | null;
  intervalMonths: number | null;
  kmSinceService: number | null;
  monthsSinceService: number | null;
}

/**
 * Ch71's mobile Customer app Vehicle Health screen — a deliberately
 * rule-based (not ML) preventive-maintenance calculation, since no
 * telemetry/OBD-II feed exists to train anything against (see the ML
 * roadmap's Phase 1). One row per rule for the vehicle's type; a
 * serviceType with no logged record ever is NOT_TRACKED, never flagged as
 * overdue on day one. currentOdometerKm is the max odometerKm across ALL of
 * a vehicle's records — one physical odometer, regardless of which service
 * was logged most recently.
 */
export function computeMaintenanceDueStatus(
  currentOdometerKm: number | null,
  records: MaintenanceRecordLike[],
  rules: MaintenanceIntervalRuleLike[],
  now: Date = new Date(),
): MaintenanceDueRow[] {
  return rules.map((rule) => {
    const latest = records
      .filter((record) => record.serviceType === rule.serviceType)
      .sort((a, b) => b.servicedAt.getTime() - a.servicedAt.getTime())[0];

    if (!latest) {
      return {
        serviceType: rule.serviceType,
        status: MaintenanceDueStatus.NOT_TRACKED,
        lastServicedAt: null,
        lastOdometerKm: null,
        intervalKm: rule.intervalKm,
        intervalMonths: rule.intervalMonths,
        kmSinceService: null,
        monthsSinceService: null,
      };
    }

    const kmSinceService = currentOdometerKm != null ? currentOdometerKm - latest.odometerKm : null;
    const monthsSinceService = (now.getTime() - latest.servicedAt.getTime()) / MS_PER_MONTH;

    let status = MaintenanceDueStatus.OK;
    if (isOverdue(kmSinceService, rule.intervalKm) || isOverdue(monthsSinceService, rule.intervalMonths)) {
      status = MaintenanceDueStatus.OVERDUE;
    } else if (isDueSoon(kmSinceService, rule.intervalKm) || isDueSoon(monthsSinceService, rule.intervalMonths)) {
      status = MaintenanceDueStatus.DUE_SOON;
    }

    return {
      serviceType: rule.serviceType,
      status,
      lastServicedAt: latest.servicedAt,
      lastOdometerKm: latest.odometerKm,
      intervalKm: rule.intervalKm,
      intervalMonths: rule.intervalMonths,
      kmSinceService,
      monthsSinceService: Math.round(monthsSinceService * 10) / 10,
    };
  });
}

function isOverdue(sinceValue: number | null, interval: number | null): boolean {
  return sinceValue != null && interval != null && sinceValue >= interval;
}

function isDueSoon(sinceValue: number | null, interval: number | null): boolean {
  return sinceValue != null && interval != null && sinceValue >= interval * (1 - DUE_SOON_FRACTION);
}
