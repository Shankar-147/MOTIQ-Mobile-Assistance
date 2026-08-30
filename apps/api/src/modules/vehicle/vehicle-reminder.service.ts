import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { MaintenanceDueStatus as PrismaMaintenanceDueStatus } from "@prisma/client";
import { NotificationChannel, NotificationDeliveryTier } from "@motiq/types";
import { PrismaService } from "../../common/prisma/prisma.service";
import { NotificationService } from "../notification/notification.service";
import { computeMaintenanceDueStatus, MaintenanceIntervalRuleLike, MaintenanceRecordLike } from "./maintenance-due.util";
import { shouldSendReminder } from "./vehicle-reminder.util";

const DEFAULT_LEAD_TIME_DAYS = 7;

/**
 * Ch71's mobile vehicle-health reminders — the first scheduled job in this
 * codebase (there is no scheduler anywhere else yet; even
 * MatchingService.sweepExpiredOffers() is manual-only). Reuses
 * computeMaintenanceDueStatus (the same calculation the mobile app reads
 * on-demand) rather than a second definition of "due" — this job only adds
 * the decision of *when to actually notify* (vehicle-reminder.util.ts) and
 * dedup bookkeeping on top.
 */
@Injectable()
export class VehicleReminderService {
  private readonly logger = new Logger(VehicleReminderService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_9AM)
  async sendDueReminders(): Promise<void> {
    const vehicles = await this.prisma.vehicle.findMany({
      include: { customerProfile: true },
    });

    for (const vehicle of vehicles) {
      await this.processVehicle(vehicle);
    }
  }

  private async processVehicle(vehicle: {
    id: string;
    vehicleType: string;
    customerProfileId: string;
    customerProfile: { userId: string };
  }): Promise<void> {
    const [records, rules, preferences, settings] = await Promise.all([
      this.prisma.vehicleMaintenanceRecord.findMany({ where: { vehicleId: vehicle.id } }),
      this.prisma.maintenanceIntervalRule.findMany({
        where: { vehicleType: vehicle.vehicleType as never },
      }),
      this.prisma.vehicleReminderPreference.findMany({ where: { customerProfileId: vehicle.customerProfileId } }),
      this.prisma.vehicleReminderSettings.findUnique({ where: { customerProfileId: vehicle.customerProfileId } }),
    ]);

    const currentOdometerKm = records.length > 0 ? Math.max(...records.map((r) => r.odometerKm)) : null;
    const dueRows = computeMaintenanceDueStatus(
      currentOdometerKm,
      records as unknown as MaintenanceRecordLike[],
      rules as unknown as MaintenanceIntervalRuleLike[],
    );
    const leadTimeDays = settings?.leadTimeDays ?? DEFAULT_LEAD_TIME_DAYS;
    const preferenceByServiceType = new Map(preferences.map((p) => [p.serviceType, p.enabled]));

    for (const row of dueRows) {
      const isWarning =
        row.status === "DUE_SOON" || row.status === "OVERDUE"
          ? shouldSendReminder(row, leadTimeDays)
          : false;

      const existingLog = await this.prisma.vehicleMaintenanceReminderLog.findUnique({
        where: { vehicleId_serviceType: { vehicleId: vehicle.id, serviceType: row.serviceType } },
      });

      if (!isWarning) {
        // Resolved (or never was a warning) — clear any stale log so a
        // future re-entry into DUE_SOON always notifies fresh.
        if (existingLog) {
          await this.prisma.vehicleMaintenanceReminderLog.delete({ where: { id: existingLog.id } });
        }
        continue;
      }

      const alreadyNotifiedForThisStatus = existingLog?.status === (row.status as unknown as PrismaMaintenanceDueStatus);
      if (alreadyNotifiedForThisStatus) {
        continue;
      }

      const enabled = preferenceByServiceType.get(row.serviceType) ?? true;
      if (!enabled) {
        continue;
      }

      try {
        await this.notifications.send({
          userId: vehicle.customerProfile.userId,
          channel: NotificationChannel.PUSH,
          category: "vehicle_maintenance_reminder",
          deliveryTier: NotificationDeliveryTier.BEST_EFFORT,
          title: reminderTitle(row.serviceType, row.status),
          body: reminderBody(row.serviceType, row.status, row.kmSinceService, row.intervalKm),
          payload: { vehicleId: vehicle.id, serviceType: row.serviceType, status: row.status },
        });
      } catch (error) {
        this.logger.error(
          `Failed to send maintenance reminder for vehicle ${vehicle.id}/${row.serviceType}: ${(error as Error).message}`,
        );
        continue; // don't record the log if the send itself failed — retry tomorrow
      }

      await this.prisma.vehicleMaintenanceReminderLog.upsert({
        where: { vehicleId_serviceType: { vehicleId: vehicle.id, serviceType: row.serviceType } },
        update: { status: row.status as unknown as PrismaMaintenanceDueStatus, notifiedAt: new Date() },
        create: {
          vehicleId: vehicle.id,
          serviceType: row.serviceType,
          status: row.status as unknown as PrismaMaintenanceDueStatus,
        },
      });
    }
  }
}

function reminderTitle(serviceType: string, status: string): string {
  const label = serviceType.replace(/_/g, " ").toLowerCase();
  return status === "OVERDUE" ? `${capitalize(label)} is overdue` : `${capitalize(label)} due soon`;
}

function reminderBody(
  serviceType: string,
  status: string,
  kmSinceService: number | null,
  intervalKm: number | null,
): string {
  const label = serviceType.replace(/_/g, " ").toLowerCase();
  if (status === "OVERDUE") {
    return `It's time to get your ${label} checked — it's overdue based on your service history.`;
  }
  if (kmSinceService != null && intervalKm != null) {
    const kmRemaining = Math.max(intervalKm - kmSinceService, 0);
    return `Your ${label} is coming up in about ${kmRemaining.toLocaleString()} km.`;
  }
  return `Your ${label} is coming up soon based on your service history.`;
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
