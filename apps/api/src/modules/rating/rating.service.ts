import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { RequestStatus } from "@motiq/types";
import { PrismaService } from "../../common/prisma/prisma.service";
import { DomainEvents, RatingSubmittedEvent } from "../../common/events/domain-events";
import { MatchingService } from "../matching/matching.service";
import { ProviderService } from "../provider/provider.service";

@Injectable()
export class RatingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly matchingService: MatchingService,
    private readonly providerService: ProviderService,
    private readonly events: EventEmitter2,
  ) {}

  /**
   * Ch58's guarded entry point: a customer can only rate their own,
   * already-COMPLETED request, exactly once, and the provider being rated is
   * derived from the accepted Assignment — never trusted from the client
   * (same "actor identity from the session/data, not the request body"
   * discipline as ADR 0011).
   */
  async submitForRequest(
    serviceRequestId: string,
    customerProfileId: string,
    stars: number,
    comment?: string,
  ) {
    const request = await this.prisma.serviceRequest.findUnique({ where: { id: serviceRequestId } });
    if (!request) {
      throw new NotFoundException(`ServiceRequest ${serviceRequestId} not found`);
    }
    if (request.customerProfileId !== customerProfileId) {
      throw new ForbiddenException("You can only rate your own service requests.");
    }
    if ((request.status as unknown as RequestStatus) !== RequestStatus.COMPLETED) {
      throw new BadRequestException(`ServiceRequest ${serviceRequestId} is not COMPLETED yet.`);
    }

    const existing = await this.prisma.rating.findUnique({ where: { serviceRequestId } });
    if (existing) {
      throw new ConflictException(`ServiceRequest ${serviceRequestId} has already been rated.`);
    }

    const acceptedAssignment = await this.matchingService.getAcceptedAssignment(serviceRequestId);

    const rating = await this.submit({
      serviceRequestId,
      customerProfileId,
      providerProfileId: acceptedAssignment.providerProfileId,
      stars,
      comment,
    });

    this.events.emit(DomainEvents.RatingSubmitted, {
      serviceRequestId,
      providerProfileId: acceptedAssignment.providerProfileId,
    } satisfies RatingSubmittedEvent);

    return rating;
  }

  async submit(params: {
    serviceRequestId: string;
    customerProfileId: string;
    providerProfileId: string;
    stars: number;
    comment?: string;
  }) {
    const rating = await this.prisma.rating.create({ data: params });

    // Recompute the provider's denormalized ratingAverage (Ch58) — a full
    // implementation would do this incrementally; this bootstrap phase
    // recomputes directly since correctness matters more than efficiency at
    // zero scale, and it's a single, obviously-correct aggregate query.
    // completedJobCount is NOT touched here — a job can complete without
    // ever being rated, so that counter is MatchingService's responsibility
    // (see its RequestCompleted event listener), not this one's.
    const agg = await this.prisma.rating.aggregate({
      where: { providerProfileId: params.providerProfileId },
      _avg: { stars: true },
    });
    await this.prisma.providerProfile.update({
      where: { id: params.providerProfileId },
      data: { ratingAverage: agg._avg.stars ?? 0 },
    });

    // trustScore (Ch58) depends on ratingAverage — recompute now that it's
    // changed. Owned by ProviderService (it owns ProviderProfile), not
    // duplicated here — see docs/decisions/0016-*.md.
    await this.providerService.recomputeTrustScore(params.providerProfileId);

    return rating;
  }
}
