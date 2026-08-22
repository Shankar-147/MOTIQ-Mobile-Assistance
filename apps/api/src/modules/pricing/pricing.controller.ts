import { Body, Controller, Get, Param, Post, Query, UseGuards } from "@nestjs/common";
import { UserRole } from "@motiq/types";
import { JwtAuthGuard } from "../identity/auth/guards/jwt-auth.guard";
import { Roles } from "../identity/auth/decorators/roles.decorator";
import { RolesGuard } from "../identity/auth/guards/roles.guard";
import { PricingService } from "./pricing.service";
import { CreateFareConfigDto } from "./dto/create-fare-config.dto";

@Controller()
export class PricingController {
  constructor(private readonly pricingService: PricingService) {}

  // Setting a city's fare config is money-related configuration (Ch34) and
  // Admin-only (Ch61) — same pattern as PaymentController's commission-rates.
  @Post("fare-configs")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  createFareConfig(@Body() dto: CreateFareConfigDto) {
    return this.pricingService.createFareConfig(dto);
  }

  @Get("service-areas/:serviceAreaId/fare-config")
  getActiveFareConfig(@Param("serviceAreaId") serviceAreaId: string, @Query("at") at?: string) {
    return this.pricingService.getActiveFareConfig(serviceAreaId, at ? new Date(at) : undefined);
  }
}
