import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { EventEmitter2, OnEvent } from "@nestjs/event-emitter";
import { AssignmentStatus } from "@prisma/client";
import { RequestStatus } from "@motiq/types";
import { PrismaService } from "../../common/prisma/prisma.service";
import {
  DomainEvents,
  ProviderAssignedEvent,
  ProviderTimedOutEvent,
  RequestCompletedEvent,
  RequestCreatedEvent,
} from "../../common/events/domain-events";
import { ProviderService } from "../provider/provider.service";
import { RequestService } from "../request/request.service";

const DEFAULT_SEARCH_RADIUS_METERS = 10_000;
const DEFAULT_CANDIDATE_FETCH_LIMIT = 5;
const DEFAULT_OFFER_TIMEOUT_SECONDS = 90;

/**
 * Ch53's core dispatch engine. Candidate retrieval is PostGIS-backed (Ch39,
 * via ProviderService); ranking is a hard distance-sort — there's no ranking
 * model to fall back FROM yet (Ch84/ADR 0007's fallback IS the only
 * implementation right now, not a degraded mode). Single-offer dispatch only
 * — broadcast-to-multiple is a future per-ServiceArea config (ADR 0006).
 * Timeout-driven reassignment exists as real logic (sweepExpiredOffers) but
 * has no recurring scheduler wired yet (Ch62) — see docs/decisions/0013-*.md.
 */
@Injectable()
export class MatchingService {
  private readonly logger = new Logger(MatchingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly providerService: ProviderService,
    private readonly requestService: RequestService,
    private readonly config: ConfigService,
    private readonly events: EventEmitter2,
  ) {}

  /** Request creation (Ch52) triggers matching without RequestModule ever
   * importing MatchingModule — see common/events/domain-events.ts. */
  @OnEvent(DomainEvents.RequestCreated)
  async handleRequestCreated(event: RequestCreatedEvent) {
    await this.dispatch(event.serviceRequestId);
  }

  /**
   * completedJobCount lives on ProviderProfile but is a fact about
   * Assignment/ServiceRequest completion, which Matching owns — RatingService
   * deliberately does NOT touch this counter (a job can complete without
   * ever being rated), so it's incremented here instead, on the same event
   * PaymentService settles against.
   */
  @OnEvent(DomainEvents.RequestCompleted)
  async handleRequestCompletedForJobCount(event: RequestCompletedEvent) {
    const acceptedAssignment = await this.getAcceptedAssignment(event.serviceRequestId);
    await this.prisma.providerProfile.update({
      where: { id: acceptedAssignment.providerProfileId },
      data: { completedJobCount: { increment: 1 } },
    });
  }

  /**
   * Finds the nearest eligible, not-yet-offered provider and offers them the
   * job, or expires the request if none are available. Safe to call again on
   * the same request mid-MATCHING (the reassignment retry path) — only
   * transitions REQUESTED -> MATCHING on the very first call.
   */
  async dispatch(serviceRequestId: string) {
    const request = await this.requestService.findById(serviceRequestId);
    if ((request.status as unknown as RequestStatus) === RequestStatus.REQUESTED) {
      await this.requestService.transition(serviceRequestId, RequestStatus.MATCHING);
    }

    const radiusMeters = Number(
      this.config.get("MATCHING_SEARCH_RADIUS_METERS", DEFAULT_SEARCH_RADIUS_METERS),
    );
    const candidates = await this.providerService.findNearestAvailableProvidersForRequest(
      serviceRequestId,
      radiusMeters,
      DEFAULT_CANDIDATE_FETCH_LIMIT,
    );

    if (candidates.length === 0) {
      this.logger.warn(
        `No providers available for ServiceRequest ${serviceRequestId} — expiring (Ch7 §7.5.3's "no provider available" outcome).`,
      );
      await this.requestService.transition(serviceRequestId, RequestStatus.EXPIRED);
      return { offered: false as const, reason: "no_provider_available" as const };
    }

    const nearest = candidates[0];
    const provider = await this.providerService.findById(nearest.id);

    const assignment = await this.prisma.assignment.create({
      data: {
        serviceRequestId,
        providerProfileId: provider.id,
        providerVerificationStatusAtAssignment: provider.verificationStatus,
        distanceMeters: nearest.distanceMeters,
      },
    });

    await this.requestService.transition(serviceRequestId, RequestStatus.ASSIGNED);

    this.events.emit(DomainEvents.ProviderAssigned, {
      serviceRequestId,
      assignmentId: assignment.id,
      providerProfileId: provider.id,
    } satisfies ProviderAssignedEvent);

    return { offered: true as const, assignmentId: assignment.id };
  }

  async acceptOffer(assignmentId: string, providerProfileId: string) {
    const assignment = await this.getOwnedOfferOrThrow(assignmentId, providerProfileId);

    const updateResult = await this.prisma.assignment.updateMany({
      where: { id: assignmentId, version: assignment.version },
      data: { status: AssignmentStatus.ACCEPTED, respondedAt: new Date(), version: { increment: 1 } },
    });
    if (updateResult.count === 0) {
      throw new ConflictException(
        `Assignment ${assignmentId} was already resolved (accepted/rejected/timed out) concurrently.`,
      );
    }

    await this.requestService.transition(assignment.serviceRequestId, RequestStatus.PROVIDER_ACCEPTED);
    return this.prisma.assignment.findUniqueOrThrow({ where: { id: assignmentId } });
  }

  /** Rejection immediately triggers a reassignment retry (Ch53, binding). */
  async rejectOffer(assignmentId: string, providerProfileId: string) {
    const assignment = await this.getOwnedOfferOrThrow(assignmentId, providerProfileId);

    const updateResult = await this.prisma.assignment.updateMany({
      where: { id: assignmentId, version: assignment.version },
      data: { status: AssignmentStatus.REJECTED, respondedAt: new Date(), version: { increment: 1 } },
    });
    if (updateResult.count === 0) {
      throw new ConflictException(
        `Assignment ${assignmentId} was already resolved (accepted/rejected/timed out) concurrently.`,
      );
    }

    await this.requestService.transition(assignment.serviceRequestId, RequestStatus.MATCHING);
    return this.dispatch(assignment.serviceRequestId);
  }

  /**
   * The manual stand-in for Ch62's future recurring background job: finds
   * every OFFERED assignment past its timeout window and reassigns it. Real
   * automatic scheduling (a cron/queue trigger calling this on an interval)
   * is not built yet — see docs/roadmap.md's Reconciliation Notes.
   */
  async sweepExpiredOffers() {
    const timeoutSeconds = Number(
      this.config.get("MATCHING_OFFER_TIMEOUT_SECONDS", DEFAULT_OFFER_TIMEOUT_SECONDS),
    );
    const staleAssignments = await this.prisma.assignment.findMany({
      where: {
        status: AssignmentStatus.OFFERED,
        offeredAt: { lt: new Date(Date.now() - timeoutSeconds * 1000) },
      },
    });

    let reassignedCount = 0;
    for (const assignment of staleAssignments) {
      const updateResult = await this.prisma.assignment.updateMany({
        where: { id: assignment.id, version: assignment.version },
        data: { status: AssignmentStatus.TIMED_OUT, respondedAt: new Date(), version: { increment: 1 } },
      });
      if (updateResult.count === 0) {
        continue; // resolved concurrently (a real accept/reject raced the sweep) — leave it alone
      }

      this.events.emit(DomainEvents.ProviderTimedOut, {
        serviceRequestId: assignment.serviceRequestId,
        assignmentId: assignment.id,
        providerProfileId: assignment.providerProfileId,
      } satisfies ProviderTimedOutEvent);

      await this.requestService.transition(assignment.serviceRequestId, RequestStatus.MATCHING);
      await this.dispatch(assignment.serviceRequestId);
      reassignedCount += 1;
    }

    return { sweptCount: staleAssignments.length, reassignedCount };
  }

  async listAssignmentsForRequest(serviceRequestId: string) {
    return this.prisma.assignment.findMany({
      where: { serviceRequestId },
      orderBy: { offeredAt: "asc" },
    });
  }

  /** Used by PricingService (fare's distance input) and RatingService (who to rate). */
  async getAcceptedAssignment(serviceRequestId: string) {
    const assignment = await this.prisma.assignment.findFirst({
      where: { serviceRequestId, status: AssignmentStatus.ACCEPTED },
    });
    if (!assignment) {
      throw new NotFoundException(`No accepted Assignment found for ServiceRequest ${serviceRequestId}`);
    }
    return assignment;
  }

  /**
   * The provider-side job-progress endpoint (PROVIDER_EN_ROUTE -> ARRIVED ->
   * SERVICE_IN_PROGRESS -> COMPLETED, or CANCELLED_BY_PROVIDER) — keyed by
   * assignment, not serviceRequestId, so ownership is a single lookup rather
   * than a second query against ServiceRequest (which RequestController
   * already owns the read-guard for on the customer side).
   */
  async advanceJobStatus(assignmentId: string, providerProfileId: string, to: RequestStatus) {
    const assignment = await this.prisma.assignment.findUnique({ where: { id: assignmentId } });
    if (!assignment) {
      throw new NotFoundException(`Assignment ${assignmentId} not found`);
    }
    if (assignment.providerProfileId !== providerProfileId) {
      throw new ForbiddenException(`Assignment ${assignmentId} does not belong to this provider.`);
    }
    if (assignment.status !== AssignmentStatus.ACCEPTED) {
      throw new BadRequestException(
        `Assignment ${assignmentId} is not in an accepted state (status: ${assignment.status}).`,
      );
    }
    return this.requestService.transition(assignment.serviceRequestId, to);
  }

  private async getOwnedOfferOrThrow(assignmentId: string, providerProfileId: string) {
    const assignment = await this.prisma.assignment.findUnique({ where: { id: assignmentId } });
    if (!assignment) {
      throw new NotFoundException(`Assignment ${assignmentId} not found`);
    }
    if (assignment.providerProfileId !== providerProfileId) {
      throw new ForbiddenException(`Assignment ${assignmentId} was not offered to this provider.`);
    }
    if (assignment.status !== AssignmentStatus.OFFERED) {
      throw new BadRequestException(
        `Assignment ${assignmentId} is no longer awaiting a response (status: ${assignment.status}).`,
      );
    }
    return assignment;
  }
}
