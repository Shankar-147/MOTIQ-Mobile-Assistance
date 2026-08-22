import { Body, Controller, Get, Param, Patch, Post } from "@nestjs/common";
import { ServiceAreaLaunchPhase } from "@motiq/types";
import { ServiceAreaService } from "./service-area.service";
import { CreateServiceAreaDto } from "./dto/create-service-area.dto";

@Controller("service-areas")
export class ServiceAreaController {
  constructor(private readonly serviceAreaService: ServiceAreaService) {}

  @Post()
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
  advancePhase(@Param("id") id: string, @Body("launchPhase") launchPhase: ServiceAreaLaunchPhase) {
    return this.serviceAreaService.advancePhase(id, launchPhase);
  }
}
