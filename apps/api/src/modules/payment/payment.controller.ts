import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import type { RawBodyRequest } from "@nestjs/common";
import type { Request } from "express";
import { AuthenticatedUser, UserRole } from "@motiq/types";
import { CurrentUser } from "../identity/auth/decorators/current-user.decorator";
import { JwtAuthGuard } from "../identity/auth/guards/jwt-auth.guard";
import { Roles } from "../identity/auth/decorators/roles.decorator";
import { RolesGuard } from "../identity/auth/guards/roles.guard";
import { RequestService } from "../request/request.service";
import { PaymentService } from "./payment.service";
import { CreateCommissionRateDto } from "./dto/create-commission-rate.dto";
import { ConfirmPaymentDto } from "./dto/confirm-payment.dto";

@Controller()
export class PaymentController {
  constructor(
    private readonly paymentService: PaymentService,
    private readonly requestService: RequestService,
  ) {}

  // Ch57's mobile receipt screen. Provider/Admin/Support access is
  // unrestricted here, same posture as RequestController.findOne() — see
  // that method's comment and docs/roadmap.md's Reconciliation Notes on
  // Payment ownership checks not being built out yet.
  @Get("requests/:id/payment")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.CUSTOMER, UserRole.PROVIDER, UserRole.ADMIN, UserRole.SUPPORT)
  async findByServiceRequest(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    const request = await this.requestService.findById(id);
    if (user.role === UserRole.CUSTOMER && request.customerProfileId !== user.profileId) {
      throw new ForbiddenException("You can only view payment for your own service requests.");
    }
    return this.paymentService.findByServiceRequestId(id);
  }

  // Ch57's mobile checkout screen — the customer's own checkout SDK success
  // callback, confirmed here via PaymentService.confirmClientPayment()'s
  // signature check. Same ownership discipline as the GET above: a customer
  // can only ever confirm their own request's payment.
  @Post("requests/:id/payment/confirm")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.CUSTOMER)
  async confirmPayment(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body() dto: ConfirmPaymentDto,
  ) {
    const request = await this.requestService.findById(id);
    if (request.customerProfileId !== user.profileId) {
      throw new ForbiddenException("You can only confirm payment for your own service requests.");
    }
    return this.paymentService.confirmClientPayment(
      id,
      dto.razorpayOrderId,
      dto.razorpayPaymentId,
      dto.razorpaySignature,
    );
  }

  // Ch72's mobile Provider app earnings screen — new in this phase, see
  // PaymentService.getEarningsSummaryForProvider()'s comment on why this
  // lives here (PaymentModule owns Payment) rather than on ProviderController.
  @Get("providers/me/earnings")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.PROVIDER)
  getOwnEarnings(@CurrentUser() user: AuthenticatedUser) {
    return this.paymentService.getEarningsSummaryForProvider(user.profileId);
  }

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

  // Unauthenticated by design (a webhook can't present a bearer token) — the
  // signature check inside handleRazorpayWebhook() IS the auth (Ch57,
  // binding). Uses req.rawBody, not the parsed @Body(), because Razorpay
  // signs the exact raw bytes — see main.ts's `rawBody: true`.
  @Post("payments/webhooks/razorpay")
  @HttpCode(HttpStatus.OK)
  handleRazorpayWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers("x-razorpay-signature") signature?: string,
  ) {
    if (!req.rawBody) {
      throw new BadRequestException("Missing raw request body for webhook signature verification.");
    }
    return this.paymentService.handleRazorpayWebhook(req.rawBody, signature);
  }
}
