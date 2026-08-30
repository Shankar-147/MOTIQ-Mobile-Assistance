import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { AuthenticatedUser, UserRole } from "@motiq/types";
import { CurrentUser } from "../identity/auth/decorators/current-user.decorator";
import { JwtAuthGuard } from "../identity/auth/guards/jwt-auth.guard";
import { Roles } from "../identity/auth/decorators/roles.decorator";
import { RolesGuard } from "../identity/auth/guards/roles.guard";
import { VehicleService } from "./vehicle.service";
import { CreateVehicleDto } from "./dto/create-vehicle.dto";
import { UpdateVehicleDto } from "./dto/update-vehicle.dto";
import { CreateMaintenanceRecordDto } from "./dto/create-maintenance-record.dto";
import { UpdateVehicleReminderSettingsDto } from "./dto/update-vehicle-reminder-settings.dto";

@Controller("vehicles")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.CUSTOMER)
export class VehicleController {
  constructor(private readonly vehicleService: VehicleService) {}

  @Get()
  async listMine(@CurrentUser() user: AuthenticatedUser) {
    const data = await this.vehicleService.listByCustomer(user.profileId);
    return { data, pagination: { nextCursor: null, limit: data.length } };
  }

  @Post()
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateVehicleDto) {
    return this.vehicleService.create(user.profileId, dto);
  }

  // Ch71's mobile Reminder settings screen — declared BEFORE the ":id"
  // routes below: "reminder-preferences" would otherwise be swallowed as if
  // it were a vehicle id (Express/Nest route matching is declaration-order).
  @Get("reminder-preferences")
  getReminderSettings(@CurrentUser() user: AuthenticatedUser) {
    return this.vehicleService.getReminderSettings(user.profileId);
  }

  @Patch("reminder-preferences")
  updateReminderSettings(@CurrentUser() user: AuthenticatedUser, @Body() dto: UpdateVehicleReminderSettingsDto) {
    return this.vehicleService.updateReminderSettings(user.profileId, dto);
  }

  @Patch(":id")
  update(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string, @Body() dto: UpdateVehicleDto) {
    return this.vehicleService.update(id, user.profileId, dto);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.vehicleService.remove(id, user.profileId);
  }

  @Get(":id/maintenance-records")
  listMaintenanceRecords(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.vehicleService.listMaintenanceRecords(id, user.profileId);
  }

  @Post(":id/maintenance-records")
  addMaintenanceRecord(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body() dto: CreateMaintenanceRecordDto,
  ) {
    return this.vehicleService.addMaintenanceRecord(id, user.profileId, dto);
  }

  @Get(":id/maintenance-due")
  getMaintenanceDueStatus(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.vehicleService.getMaintenanceDueStatus(id, user.profileId);
  }
}
