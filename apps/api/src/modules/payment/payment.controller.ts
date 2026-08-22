import { Body, Controller, Get, Param, Post, Query, UseGuards } from "@nestjs/common";
import { UserRole } from "@motiq/types";
import { JwtAuthGuard } from "../identity/auth/guards/jwt-auth.guard";
import { Roles } from "../identity/auth/decorators/roles.decorator";
import { RolesGuard } from "../identity/auth/guards/roles.guard";
import { PaymentService } from "./payment.service";
import { CreateCommissionRateDto } from "./dto/create-commission-rate.dto";

@Controller()
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  // Setting a city's commission rate is money-related configuration (ADR
  // 0003) and Admin-only (Ch61) — never client-settable.
  @Post("commission-rates")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  createCommissionRate(@Body() dto: CreateCommissionRateDto) {
    return this.paymentService.createCommissionRate(dto);
  }

  @Get("service-areas/:serviceAreaId/commission-rate")
  getActiveRate(
    @Param("serviceAreaId") serviceAreaId: string,
    @Query("at") at?: string,
  ) {
    return this.paymentService.getActiveCommissionRate(serviceAreaId, at ? new Date(at) : undefined);
  }
}
