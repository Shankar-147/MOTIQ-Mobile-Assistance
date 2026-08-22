import { Body, Controller, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { ServiceAreaLaunchPhase, UserRole } from "@motiq/types";
import { JwtAuthGuard } from "../identity/auth/guards/jwt-auth.guard";
import { Roles } from "../identity/auth/decorators/roles.decorator";
import { RolesGuard } from "../identity/auth/guards/roles.guard";
import { ServiceAreaService } from "./service-area.service";
import { CreateServiceAreaDto } from "./dto/create-service-area.dto";

@Controller("service-areas")
export class ServiceAreaController {
  constructor(private readonly serviceAreaService: ServiceAreaService) {}

  // Onboarding a city (Ch7) and advancing its launch phase are Admin-only
  // operations (Ch61). Reads stay open — e.g. a not-yet-authenticated mobile
  // client may need the city list to let a user pick where they are.
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  create(@Body() dto: CreateServiceAreaDto) {
    return this.serviceAreaService.create(dto);
  }

  @Get()
  findAll() {
    return this.serviceAreaService.findAll();
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.serviceAreaService.findById(id);
  }

  @Patch(":id/launch-phase")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  advancePhase(@Param("id") id: string, @Body("launchPhase") launchPhase: ServiceAreaLaunchPhase) {
    return this.serviceAreaService.advancePhase(id, launchPhase);
  }
}
