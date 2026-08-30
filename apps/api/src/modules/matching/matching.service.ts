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
import { AssignmentStatus, RequestStatus as PrismaRequestStatus } from "@prisma/client";
import { ProviderVerificationStatus, RequestStatus } from "@motiq/types";
import { PrismaService } from "../../common/prisma/prisma.service";
import {
  DomainEvents,
  MatchingFailedEvent,
  ProviderAssignedEvent,
  ProviderTimedOutEvent,
  RequestCompletedEvent,
  RequestCreatedEvent,
} from "../../common/events/domain-events";
import { ProviderService } from "../provider/provider.service";
import { RequestService } from "../request/request.service";
import { isEligibleForMatching } from "../provider/provider-verification-state-machine";
import { AiService } from "../ai/ai.service";

const DEFAULT_SEARCH_RADIUS_METERS = 10_000;
const DEFAULT_CANDIDATE_FETCH_LIMIT = 5;
const DEFAULT_OFFER_TIMEOUT_SECONDS = 90;

/**
 * Ch53's core dispatch engine. Candidate retrieval is PostGIS-backed (Ch39,
 * via ProviderService); candidates are then re-ranked via AiService's
 * weighted-score ranker (Ch84, Phase 6) — a hard distance-sort fallback
 * (ADR 0007/Ch35) applies if ranking throws, so a ranking-layer failure
 * never blocks dispatch. Single-offer dispatch only — broadcast-to-multiple
 * is a future per-ServiceArea config (ADR 0006). Timeout-driven reassignment
 * exists as real logic (sweepExpiredOffers) but has no recurring scheduler
 * wired yet (Ch62) — see docs/decisions/0013-*.md.
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
    private readonly aiService: AiService,
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
      this.events.emit(DomainEvents.MatchingFailed, {
        serviceRequestId,
      } satisfies MatchingFailedEvent);
      return { offered: false as const, reason: "no_provider_available" as const };
    }

    const topRanked = await this.rankCandidatesWithFallback(candidates);
    const provider = await this.providerService.findById(topRanked.id);

    const assignment = await this.prisma.assignment.create({
      data: {
        serviceRequestId,
        providerProfileId: provider.id,
        providerVerificationStatusAtAssignment: provider.verificationStatus,
        distanceMeters: topRanked.distanceMeters,
        providerTrustScoreAtOffer: provider.trustScore,
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

  /**
   * ADR 0007/Ch35's non-negotiable fallback: a ranking-layer failure must
   * never block dispatch. Candidates already arrive distance-sorted from
   * ProviderService's PostGIS query, so falling back to `candidates[0]`
   * unranked is exactly the "hard distance-sort" fallback Ch84 requires —
   * not a degraded improvisation.
   */
  private async rankCandidatesWithFallback(
    candidates: { id: string; distanceMeters: number; trustScore: number }[],
  ): Promise<{ id: string; distanceMeters: number }> {
    try {
      const ranked = await this.aiService.rankProviders(candidates);
      return ranked[0];
    } catch (error) {
      this.logger.error(
        `Provider ranking failed, falling back to distance-sort order: ${(error as Error).message}`,
      );
      return candidates[0];
    }
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

  /**
   * The matching-ranking training-data export (see the ML roadmap): every
   * Assignment already carries what the ranker saw at decision time
   * (distanceMeters, providerVerificationStatusAtAssignment,
   * providerTrustScoreAtOffer) plus its own outcome (status,
   * offeredAt/respondedAt) — this just joins in the request's issueType and
   * final status for the label. Cursor-paginated, same convention as every
   * other list endpoint (docs/api-conventions.md).
   */
  async listTrainingDataAssignments(params: { cursor?: string; limit?: number }) {
    const limit = Math.min(params.limit ?? 25, 100);
    const assignments = await this.prisma.assignment.findMany({
      take: limit + 1,
      ...(params.cursor ? { cursor: { id: params.cursor }, skip: 1 } : {}),
      orderBy: { offeredAt: "desc" },
      include: {
        serviceRequest: { select: { issueType: true, status: true } },
      },
    });

    const hasMore = assignments.length > limit;
    const page = hasMore ? assignments.slice(0, limit) : assignments;
    return {
      data: page,
      pagination: { nextCursor: hasMore ? page[page.length - 1].id : null, limit },
    };
  }

  /**
   * Used by TrackingGateway (Ch54) to find which ServiceRequest a provider's
   * location update should broadcast to — assumes a provider works one job
   * at a time (a reasonable bootstrap-scope simplification; nothing in the
   * schema enforces it). `Assignment.status` never transitions away from
   * ACCEPTED once a job finishes — there's no "job completed" state on
   * Assignment itself, only on ServiceRequest — so a provider who has ever
   * completed a job accumulates multiple ACCEPTED assignments over time.
   * Filtering on Assignment.status alone (the previous version of this
   * query) would non-deterministically match a long-finished job instead of
   * the current one, silently broadcasting live location into the wrong
   * (nobody-listening) request room. Joins against ServiceRequest and
   * excludes every terminal status, then takes the most recently offered
   * match as a defensive tie-breaker.
   */
  async getActiveAssignmentForProvider(providerProfileId: string) {
    return this.prisma.assignment.findFirst({
      where: {
        providerProfileId,
        status: AssignmentStatus.ACCEPTED,
        serviceRequest: {
          status: {
            notIn: [
              PrismaRequestStatus.COMPLETED,
              PrismaRequestStatus.CANCELLED_BY_CUSTOMER,
              PrismaRequestStatus.CANCELLED_BY_PROVIDER,
              PrismaRequestStatus.FAILED,
            ],
          },
        },
      },
      orderBy: { offeredAt: "desc" },
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

  /**
   * Ch61's admin manual dispatch override — the escape hatch for a request
   * automated matching gave up on (EXPIRED, "no_provider_available") or
   * hasn't resolved yet (MATCHING). An admin's decision is immediately
   * binding: no offer/response phase, straight to ACCEPTED. Deliberately
   * reuses every guard automated dispatch would apply — same-city (CLAUDE.md
   * rule 8, now enforceable thanks to ServiceAreaService.resolveForPoint)
   * and verification eligibility — a human override still can never assign
   * a SUSPENDED/DELISTED provider or reach across cities; those are hard
   * trust-and-safety/data-scoping lines, not just automation conveniences.
   */
  async adminOverrideDispatch(serviceRequestId: string, providerProfileId: string) {
    const request = await this.requestService.findById(serviceRequestId);
    const currentStatus = request.status as unknown as RequestStatus;
    if (currentStatus !== RequestStatus.MATCHING && currentStatus !== RequestStatus.EXPIRED) {
      throw new BadRequestException(
        `ServiceRequest ${serviceRequestId} is not awaiting dispatch (status: ${currentStatus}) — ` +
          "manual override only applies to MATCHING or EXPIRED requests.",
      );
    }

    const provider = await this.providerService.findById(providerProfileId);
    if (provider.serviceAreaId !== request.serviceAreaId) {
      throw new BadRequestException(
        `Provider ${providerProfileId} belongs to a different ServiceArea than ServiceRequest ${serviceRequestId}.`,
      );
    }
    if (!isEligibleForMatching(provider.verificationStatus as unknown as ProviderVerificationStatus)) {
      throw new BadRequestException(
        `Provider ${providerProfileId} is not eligible for matching (verificationStatus: ${provider.verificationStatus}).`,
      );
    }

    // Any automated OFFERED assignment this request already has is
    // superseded, not rejected — the provider it was offered to never
    // actually declined it, an admin just overrode the whole decision.
    await this.prisma.assignment.updateMany({
      where: { serviceRequestId, status: AssignmentStatus.OFFERED },
      data: { status: AssignmentStatus.SUPERSEDED, respondedAt: new Date() },
    });

    const distanceMeters = await this.providerService.getDistanceToServiceRequestPickup(
      providerProfileId,
      serviceRequestId,
    );

    const assignment = await this.prisma.assignment.create({
      data: {
        serviceRequestId,
        providerProfileId,
        status: AssignmentStatus.ACCEPTED,
        providerVerificationStatusAtAssignment: provider.verificationStatus,
        distanceMeters,
        providerTrustScoreAtOffer: provider.trustScore,
        respondedAt: new Date(),
      },
    });

    await this.requestService.transition(serviceRequestId, RequestStatus.PROVIDER_ACCEPTED);

    // Same event automated dispatch emits — the mobile apps and
    // NotificationEventListener react to it identically either way, no
    // special-casing needed anywhere downstream of this.
    this.events.emit(DomainEvents.ProviderAssigned, {
      serviceRequestId,
      assignmentId: assignment.id,
      providerProfileId,
    } satisfies ProviderAssignedEvent);

    return assignment;
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
