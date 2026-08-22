import { Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../common/prisma/prisma.service";
import { calculateCommissionSplit, money } from "../../common/money";
import { CreateCommissionRateDto } from "./dto/create-commission-rate.dto";

/**
 * Owns CommissionRate (ADR 0003) and Payment. Every other module that needs
 * "what's the current rate for this city" or "record a completed payment"
 * goes through this service — never a direct query against these tables.
 */
@Injectable()
export class PaymentService {
  constructor(private readonly prisma: PrismaService) {}

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
}
