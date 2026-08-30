import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../common/prisma/prisma.service";
import { CreateVehicleDto } from "./dto/create-vehicle.dto";
import { UpdateVehicleDto } from "./dto/update-vehicle.dto";
import { CreateMaintenanceRecordDto } from "./dto/create-maintenance-record.dto";
import { UpdateVehicleReminderSettingsDto } from "./dto/update-vehicle-reminder-settings.dto";
import { computeMaintenanceDueStatus, MaintenanceIntervalRuleLike, MaintenanceRecordLike } from "./maintenance-due.util";
import { MaintenanceServiceType } from "@motiq/types";

/** Ch71's mobile Customer app Profile screen — lets a customer register the
 * vehicle(s) they request roadside assistance for. See RequestService's
 * resolveVehicleSnapshot(), which reads rows this module creates. */
@Injectable()
export class VehicleService {
  constructor(private readonly prisma: PrismaService) {}

  async listByCustomer(customerProfileId: string) {
    return this.prisma.vehicle.findMany({
      where: { customerProfileId },
      orderBy: { createdAt: "desc" },
    });
  }

  async create(customerProfileId: string, dto: CreateVehicleDto) {
    return this.prisma.vehicle.create({
      data: { customerProfileId, ...dto },
    });
  }

  async update(id: string, customerProfileId: string, dto: UpdateVehicleDto) {
    await this.findOwned(id, customerProfileId);
    return this.prisma.vehicle.update({ where: { id }, data: dto });
  }

  async remove(id: string, customerProfileId: string) {
    await this.findOwned(id, customerProfileId);
    await this.prisma.vehicle.delete({ where: { id } });
  }

  private async findOwned(id: string, customerProfileId: string) {
    const vehicle = await this.prisma.vehicle.findUnique({ where: { id } });
    if (!vehicle) {
      throw new NotFoundException(`Vehicle ${id} not found`);
    }
    if (vehicle.customerProfileId !== customerProfileId) {
      throw new ForbiddenException("You can only manage your own vehicles.");
    }
    return vehicle;
  }

  async listMaintenanceRecords(vehicleId: string, customerProfileId: string) {
    await this.findOwned(vehicleId, customerProfileId);
    return this.prisma.vehicleMaintenanceRecord.findMany({
      where: { vehicleId },
      orderBy: { servicedAt: "desc" },
    });
  }

  async addMaintenanceRecord(vehicleId: string, customerProfileId: string, dto: CreateMaintenanceRecordDto) {
    await this.findOwned(vehicleId, customerProfileId);
    return this.prisma.vehicleMaintenanceRecord.create({
      data: { vehicleId, ...dto },
    });
  }

  /** Ch71's mobile Vehicle Health screen — deliberately rule-based, not ML
   * (see maintenance-due.util.ts's doc comment and the ML roadmap's Phase 1).
   * currentOdometerKm is the max odometerKm ever logged for this vehicle. */
  async getMaintenanceDueStatus(vehicleId: string, customerProfileId: string) {
    const vehicle = await this.findOwned(vehicleId, customerProfileId);
    const [records, rules] = await Promise.all([
      this.prisma.vehicleMaintenanceRecord.findMany({ where: { vehicleId } }),
      this.prisma.maintenanceIntervalRule.findMany({ where: { vehicleType: vehicle.vehicleType } }),
    ]);

    const currentOdometerKm =
      records.length > 0 ? Math.max(...records.map((record) => record.odometerKm)) : null;

    return computeMaintenanceDueStatus(
      currentOdometerKm,
      records as unknown as MaintenanceRecordLike[],
      rules as unknown as MaintenanceIntervalRuleLike[],
    );
  }

  /** Ch71's mobile Reminder settings screen — fills in the enabled:true
   * default for any category the customer hasn't customized yet, so the UI
   * always sees a complete, current list of categories. */
  async getReminderSettings(customerProfileId: string) {
    const [preferences, settings] = await Promise.all([
      this.prisma.vehicleReminderPreference.findMany({ where: { customerProfileId } }),
      this.prisma.vehicleReminderSettings.findUnique({ where: { customerProfileId } }),
    ]);
    const enabledByServiceType = new Map(preferences.map((p) => [p.serviceType, p.enabled]));

    return {
      preferences: Object.values(MaintenanceServiceType).map((serviceType) => ({
        serviceType,
        enabled: enabledByServiceType.get(serviceType as never) ?? true,
      })),
      leadTimeDays: settings?.leadTimeDays ?? 7,
    };
  }

  async updateReminderSettings(customerProfileId: string, dto: UpdateVehicleReminderSettingsDto) {
    await Promise.all([
      ...dto.preferences.map((preference) =>
        this.prisma.vehicleReminderPreference.upsert({
          where: { customerProfileId_serviceType: { customerProfileId, serviceType: preference.serviceType } },
          update: { enabled: preference.enabled },
          create: { customerProfileId, serviceType: preference.serviceType, enabled: preference.enabled },
        }),
      ),
      this.prisma.vehicleReminderSettings.upsert({
        where: { customerProfileId },
        update: { leadTimeDays: dto.leadTimeDays },
        create: { customerProfileId, leadTimeDays: dto.leadTimeDays },
      }),
    ]);
    return this.getReminderSettings(customerProfileId);
  }
}
