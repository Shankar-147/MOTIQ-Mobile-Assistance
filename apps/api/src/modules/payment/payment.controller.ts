import { Body, Controller, Get, Param, Post, Query } from "@nestjs/common";
import { PaymentService } from "./payment.service";
import { CreateCommissionRateDto } from "./dto/create-commission-rate.dto";

@Controller()
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Post("commission-rates")
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
