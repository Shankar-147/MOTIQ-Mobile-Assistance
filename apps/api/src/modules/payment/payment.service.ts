import { BadRequestException, Inject, Injectable, Logger, NotFoundException, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { EventEmitter2, OnEvent } from "@nestjs/event-emitter";
import { AssignmentStatus, PaymentStatus as PrismaPaymentStatus, Prisma } from "@prisma/client";
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

  /** Ch57's mobile receipt screen — returns null (not a 404) when a request
   * hasn't reached COMPLETED/settlement yet, which is a normal transient
   * state, not an error. Attaches the gateway's public key id whenever an
   * order exists and payment is still outstanding — the mobile checkout
   * screen needs it to open a checkout session; it's a public identifier,
   * never the key secret. */
  async findByServiceRequestId(serviceRequestId: string) {
    const payment = await this.prisma.payment.findUnique({ where: { serviceRequestId } });
    if (!payment) {
      return null;
    }
    const needsCheckout = payment.status === PrismaPaymentStatus.AUTHORIZED && payment.gatewayReference;
    return {
      ...payment,
      razorpayKeyId: needsCheckout ? this.gateway.getPublicKeyId() : null,
    };
  }

  /**
   * The customer checkout screen's confirmation call — Razorpay's checkout
   * SDK hands the client `razorpay_order_id`/`razorpay_payment_id`/
   * `razorpay_signature` on a successful charge; this verifies that
   * signature (a different formula from the webhook's, see
   * verifyRazorpayPaymentSignature's doc comment) before trusting it.
   * The webhook handler above remains the authoritative reconciliation path
   * for CAPTURED — this is an additional, equally-verified path that gives
   * the customer immediate feedback without waiting on a webhook round trip.
   * Idempotent: replaying with the same (already-verified) values on an
   * already-CAPTURED payment is a no-op, not an error.
   */
  async confirmClientPayment(
    serviceRequestId: string,
    razorpayOrderId: string,
    razorpayPaymentId: string,
    razorpaySignature: string,
  ) {
    const payment = await this.prisma.payment.findUnique({ where: { serviceRequestId } });
    if (!payment) {
      throw new NotFoundException(`No Payment found for ServiceRequest ${serviceRequestId}`);
    }
    if (payment.gatewayReference !== razorpayOrderId) {
      throw new BadRequestException("razorpayOrderId does not match this payment's order.");
    }
    if (payment.status === PrismaPaymentStatus.CAPTURED) {
      return payment; // Already confirmed — idempotent no-op.
    }

    const valid = this.gateway.verifyClientPaymentSignature(
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
    );
    if (!valid) {
      throw new UnauthorizedException("Invalid Razorpay checkout signature.");
    }

    return this.prisma.payment.update({
      where: { id: payment.id },
      data: { status: PrismaPaymentStatus.CAPTURED },
    });
  }

  /**
   * Ch72's mobile Provider app earnings screen. Payment has no direct
   * providerProfileId column (only serviceRequestId) — a provider's payments
   * are found via the ACCEPTED Assignment on each request, the same join
   * RatingService.submitForRequest uses via MatchingService.getAcceptedAssignment,
   * done here as a direct relation filter since no cross-module call is
   * needed. totalEarnings only counts CAPTURED payments — in an environment
   * with no live gateway configured (see settleServiceRequest() above),
   * payments stay PENDING and this will honestly read ₹0 until a real
   * webhook fires, which is correct, not a bug.
   */
  async getEarningsSummaryForProvider(providerProfileId: string) {
    const payments = await this.prisma.payment.findMany({
      where: {
        serviceRequest: {
          assignments: { some: { providerProfileId, status: AssignmentStatus.ACCEPTED } },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const captured = payments.filter((p) => p.status === PrismaPaymentStatus.CAPTURED);
    const pending = payments.filter(
      (p) => p.status === PrismaPaymentStatus.PENDING || p.status === PrismaPaymentStatus.AUTHORIZED,
    );
    const sum = (rows: typeof payments) =>
      rows.reduce((total, p) => total.plus(p.providerPayoutAmount), new Prisma.Decimal(0));

    return {
      totalEarnings: sum(captured).toFixed(2),
      pendingAmount: sum(pending).toFixed(2),
      completedPayoutCount: captured.length,
      recentPayments: payments.slice(0, 10).map((p) => ({
        id: p.id,
        serviceRequestId: p.serviceRequestId,
        amount: p.providerPayoutAmount.toFixed(2),
        status: p.status,
        createdAt: p.createdAt,
      })),
    };
  }

  private emitSettled(serviceRequestId: string, paymentId: string) {
    this.events.emit(DomainEvents.PaymentSettled, {
      serviceRequestId,
      paymentId,
    } satisfies PaymentSettledEvent);
  }
}
