import { Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../common/prisma/prisma.service";
import { money } from "../../common/money";
import { RequestService } from "../request/request.service";
import { MatchingService } from "../matching/matching.service";
import { CreateFareConfigDto } from "./dto/create-fare-config.dto";
import { FareBreakdown, calculateFare } from "./fare.util";

/**
 * Owns FareConfig and the fare-calculation entry point (Ch56, ADR 0012).
 * No surge-forecasting model exists yet (Ch86 is future ML work) — surge is
 * always 1.00 (no surge) in this phase, which is itself a trivially
 * explainable value, satisfying Ch8's "never opaque" requirement by having
 * nothing to hide yet rather than by fabricating an explanation for a real
 * multiplier.
 */
@Injectable()
export class PricingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly requestService: RequestService,
    private readonly matchingService: MatchingService,
  ) {}

  async createFareConfig(dto: CreateFareConfigDto) {
    return this.prisma.fareConfig.create({
      data: {
        serviceAreaId: dto.serviceAreaId,
        baseFare: new Prisma.Decimal(dto.baseFare),
        perKmRate: new Prisma.Decimal(dto.perKmRate),
        maxSurgeMultiplier: new Prisma.Decimal(dto.maxSurgeMultiplier ?? 1),
        effectiveFrom: new Date(dto.effectiveFrom),
      },
    });
  }

  async getActiveFareConfig(serviceAreaId: string, atDate: Date = new Date()) {
    const config = await this.prisma.fareConfig.findFirst({
      where: { serviceAreaId, effectiveFrom: { lte: atDate } },
      orderBy: { effectiveFrom: "desc" },
    });
    if (!config) {
      throw new NotFoundException(
        `No FareConfig configured for ServiceArea ${serviceAreaId} as of ${atDate.toISOString()}`,
      );
    }
    return config;
  }

  /**
   * Ch56's distance input is the accepted Assignment's provider-to-pickup
   * distance captured at match time (see docs/decisions/0012-*.md) — there's
   * no separate route/tracking distance yet (Ch32, Ch54 are future work).
   * Reads the request via RequestService and the assignment via
   * MatchingService rather than querying their tables directly (ADR 0001).
   */
  async calculateFareForServiceRequest(serviceRequestId: string): Promise<FareBreakdown> {
    const request = await this.requestService.findById(serviceRequestId);
    const acceptedAssignment = await this.matchingService.getAcceptedAssignment(serviceRequestId);
    if (acceptedAssignment.distanceMeters === null) {
      throw new NotFoundException(
        `Assignment ${acceptedAssignment.id} for ServiceRequest ${serviceRequestId} has no recorded distance.`,
      );
    }

    const fareConfig = await this.getActiveFareConfig(request.serviceAreaId);
    const distanceKm = money(acceptedAssignment.distanceMeters / 1000);

    return calculateFare({
      distanceKm,
      baseFare: fareConfig.baseFare,
      perKmRate: fareConfig.perKmRate,
      surgeMultiplier: money("1.00"), // no live surge system yet — see class doc
      maxSurgeMultiplier: fareConfig.maxSurgeMultiplier,
      promotionDiscount: money("0.00"), // no promotions system yet
    });
  }
}
