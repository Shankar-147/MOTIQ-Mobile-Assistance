import { BadRequestException, Inject, Injectable, Logger, NotFoundException, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { EventEmitter2, OnEvent } from "@nestjs/event-emitter";
import { PaymentStatus as PrismaPaymentStatus, Prisma } from "@prisma/client";
import { RequestStatus } from "@motiq/types";
import { PrismaService } from "../../common/prisma/prisma.service";
import { calculateCommissionSplit, money } from "../../common/money";
import { DomainEvents, PaymentSettledEvent, RequestCompletedEvent } from "../../common/events/domain-events";
import { PricingService } from "../pricing/pricing.service";
import { CreateCommissionRateDto } from "./dto/create-commission-rate.dto";
import { PAYMENT_GATEWAY, PaymentGatewayPort } from "./gateways/payment-gateway.port";
import { verifyRazorpaySignature } from "./gateways/razorpay-signature.util";

/**
 * Owns CommissionRate (ADR 0003) and Payment. Every other module that needs
 * "what's the current rate for this city" or "record a completed payment"
 * goes through this service — never a direct query against these tables.
 * Settlement (Ch57) reacts to RequestCompleted (ADR 0013) and calls out to
 * PricingService (Ch56) and the PaymentGatewayPort (Ch32/Razorpay, ADR 0014).
 */
@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly pricingService: PricingService,
    private readonly config: ConfigService,
    private readonly events: EventEmitter2,
    @Inject(PAYMENT_GATEWAY) private readonly gateway: PaymentGatewayPort,
  ) {}

  async createCommissionRate(dto: CreateCommissionRateDto) {
    return this.prisma.commissionRate.create({
      data: {
        serviceAreaId: dto.serviceAreaId,
        ratePercentage: new Prisma.Decimal(dto.ratePercentage),
        effectiveFrom: new Date(dto.effectiveFrom),
      },
    });
  }

  /** The rate that applies right now for a given city — see ADR 0003's audit-trail rationale. */
  async getActiveCommissionRate(serviceAreaId: string, atDate: Date = new Date()) {
    const rate = await this.prisma.commissionRate.findFirst({
      where: { serviceAreaId, effectiveFrom: { lte: atDate } },
      orderBy: { effectiveFrom: "desc" },
    });
    if (!rate) {
      throw new NotFoundException(
        `No CommissionRate configured for ServiceArea ${serviceAreaId} as of ${atDate.toISOString()}`,
      );
    }
    return rate;
  }

  /**
   * Records the three auditable amounts required by Ch6/Ch57 against the
   * CommissionRate that actually produced them — never derived-on-read later.
   */
  async createPayment(params: {
    serviceRequestId: string;
    totalAmount: string;
    serviceAreaId: string;
    idempotencyKey: string;
  }) {
    const existing = await this.prisma.payment.findUnique({
      where: { idempotencyKey: params.idempotencyKey },
    });
    if (existing) {
      return existing; // Idempotency-Key replay — see docs/api-conventions.md
    }

    const activeRate = await this.getActiveCommissionRate(params.serviceAreaId);
    const split = calculateCommissionSplit(money(params.totalAmount), activeRate.ratePercentage);

    return this.prisma.payment.create({
      data: {
        serviceRequestId: params.serviceRequestId,
        commissionRateId: activeRate.id,
        totalAmount: split.totalAmount,
        commissionAmount: split.commissionAmount,
        providerPayoutAmount: split.providerPayoutAmount,
        idempotencyKey: params.idempotencyKey,
      },
    });
  }

  /** Auto-triggered on job completion — see the @OnEvent listener below. */
  @OnEvent(DomainEvents.RequestCompleted)
  async handleRequestCompleted(event: RequestCompletedEvent) {
    await this.settleServiceRequest(event.serviceRequestId);
  }

  /**
   * Computes the fare (Ch56), splits it into commission/payout (Ch6, ADR
   * 0003), and — if a gateway is configured — creates a Razorpay order.
   * Idempotent per request (`settle:${serviceRequestId}`): a request can only
   * ever be settled once, so replays (an event firing twice, a retried call)
   * never double-charge.
   */
  async settleServiceRequest(serviceRequestId: string) {
    const request = await this.prisma.serviceRequest.findUnique({ where: { id: serviceRequestId } });
    if (!request) {
      throw new NotFoundException(`ServiceRequest ${serviceRequestId} not found`);
    }
    if ((request.status as unknown as RequestStatus) !== RequestStatus.COMPLETED) {
      throw new BadRequestException(
        `ServiceRequest ${serviceRequestId} is not COMPLETED yet (status: ${request.status}).`,
      );
    }

    const fare = await this.pricingService.calculateFareForServiceRequest(serviceRequestId);
    const payment = await this.createPayment({
      serviceRequestId,
      serviceAreaId: request.serviceAreaId,
      totalAmount: fare.totalAmount.toFixed(2),
      idempotencyKey: `settle:${serviceRequestId}`,
    });

    if (payment.gatewayReference || !this.gateway.isConfigured()) {
      if (!this.gateway.isConfigured()) {
        this.logger.warn(
          `Payment gateway not configured — Payment ${payment.id} settled as PENDING with no gateway order (Ch32).`,
        );
      }
      this.emitSettled(serviceRequestId, payment.id);
      return payment;
    }

    try {
      const order = await this.gateway.createOrder({
        amount: payment.totalAmount,
        currency: "INR",
        receipt: payment.id,
      });
      const updated = await this.prisma.payment.update({
        where: { id: payment.id },
        data: { gatewayReference: order.orderId, status: PrismaPaymentStatus.AUTHORIZED },
      });
      this.emitSettled(serviceRequestId, payment.id);
      return updated;
    } catch (error) {
      // Payment row stays PENDING with no gatewayReference — a real
      // retry/reconciliation job is Ch62 future work, not built here.
      this.logger.error(`Razorpay order creation failed for Payment ${payment.id}`, error as Error);
      this.emitSettled(serviceRequestId, payment.id);
      return payment;
    }
  }

  /**
   * Ch57: webhook signature verification is mandatory. `rawBody` must be the
   * exact bytes Razorpay signed — see main.ts's `rawBody: true` and
   * PaymentController's webhook route.
   */
  async handleRazorpayWebhook(rawBody: Buffer, signature: string | undefined) {
    const secret = this.config.get<string>("RAZORPAY_WEBHOOK_SECRET");
    if (!secret) {
      throw new Error("RAZORPAY_WEBHOOK_SECRET is not configured — cannot verify webhook signatures.");
    }
    if (!signature || !verifyRazorpaySignature(rawBody, signature, secret)) {
      throw new UnauthorizedException("Invalid Razorpay webhook signature.");
    }

    const payload = JSON.parse(rawBody.toString("utf8")) as {
      event?: string;
      payload?: { payment?: { entity?: { order_id?: string } } };
    };
    const orderId = payload.payload?.payment?.entity?.order_id;
    if (!orderId) {
      return { handled: false as const, reason: "no_order_id_in_payload" as const };
    }

    const payment = await this.prisma.payment.findFirst({ where: { gatewayReference: orderId } });
    if (!payment) {
      return { handled: false as const, reason: "no_matching_payment" as const };
    }

    if (payload.event === "payment.captured") {
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: { status: PrismaPaymentStatus.CAPTURED },
      });
    } else if (payload.event === "payment.failed") {
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: { status: PrismaPaymentStatus.FAILED },
      });
    }

    return { handled: true as const };
  }

  private emitSettled(serviceRequestId: string, paymentId: string) {
    this.events.emit(DomainEvents.PaymentSettled, {
      serviceRequestId,
      paymentId,
    } satisfies PaymentSettledEvent);
  }
}
