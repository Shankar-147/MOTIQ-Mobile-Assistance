import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { AuthenticatedUser, UserRole } from "@motiq/types";
import { CurrentUser } from "../identity/auth/decorators/current-user.decorator";
import { JwtAuthGuard } from "../identity/auth/guards/jwt-auth.guard";
import { Roles } from "../identity/auth/decorators/roles.decorator";
import { RolesGuard } from "../identity/auth/guards/roles.guard";
import { ProviderFleetVehicleService } from "./provider-fleet-vehicle.service";
import { CreateProviderFleetVehicleDto } from "./dto/create-provider-fleet-vehicle.dto";
import { UpdateProviderFleetVehicleDto } from "./dto/update-provider-fleet-vehicle.dto";

@Controller("provider-fleet-vehicles")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.PROVIDER)
export class ProviderFleetVehicleController {
  constructor(private readonly fleetVehicleService: ProviderFleetVehicleService) {}

  @Get()
  async listMine(@CurrentUser() user: AuthenticatedUser) {
    const data = await this.fleetVehicleService.listByProvider(user.profileId);
    return { data, pagination: { nextCursor: null, limit: data.length } };
  }

  @Post()
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateProviderFleetVehicleDto) {
    return this.fleetVehicleService.create(user.profileId, dto);
  }

  @Patch(":id")
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body() dto: UpdateProviderFleetVehicleDto,
  ) {
    return this.fleetVehicleService.update(id, user.profileId, dto);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.fleetVehicleService.remove(id, user.profileId);
  }
}
