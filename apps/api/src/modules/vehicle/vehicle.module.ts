import { Module } from "@nestjs/common";
import { NotificationModule } from "../notification/notification.module";
import { VehicleController } from "./vehicle.controller";
import { VehicleService } from "./vehicle.service";
import { VehicleReminderService } from "./vehicle-reminder.service";

/**
 * Owns Vehicle CRUD (RequestModule still owns the read-only snapshot copy
 * taken at request-creation time — see RequestService.resolveVehicleSnapshot)
 * plus the preventive-maintenance reminder scheduler. Imports
 * NotificationModule one-directionally (NotificationModule has no
 * dependency back on VehicleModule) to send reminders through the existing
 * multi-channel push pipeline rather than a second one.
 */
@Module({
  imports: [NotificationModule],
  controllers: [VehicleController],
  providers: [VehicleService, VehicleReminderService],
  exports: [VehicleService],
})
export class VehicleModule {}
