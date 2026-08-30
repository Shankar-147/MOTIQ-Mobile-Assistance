import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { ProviderVerificationStatus } from "@motiq/types";
import { PrismaService } from "../../common/prisma/prisma.service";
import { ProviderService } from "../provider/provider.service";
import { RequestService } from "../request/request.service";
import { MatchingService } from "../matching/matching.service";

/**
 * Ch61's "provider-verification workflow backend" and, as of this phase,
 * its other named responsibility — manual dispatch override. Provider owns
 * the underlying entities (ProviderVerificationDocument,
 * ProviderProfile.verificationStatus) and the guarded state machine (Ch98,
 * ADR 0016); Matching owns Assignment and the guarded dispatch decision
 * (Ch53, ADR 0004). This service delegates the actual mutations to their
 * owning services and adds what Admin owns: the audit trail.
 */
@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly providerService: ProviderService,
    private readonly requestService: RequestService,
    private readonly matchingService: MatchingService,
  ) {}

  async recordAuditLog(params: {
    actorUserId?: string;
    action: string;
    entityType: string;
    entityId: string;
    metadata?: Record<string, unknown>;
  }) {
    const data: Prisma.AuditLogUncheckedCreateInput = {
      actorUserId: params.actorUserId,
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId,
      metadata: params.metadata as Prisma.InputJsonValue | undefined,
    };
    return this.prisma.auditLog.create({ data });
  }

  async listPendingVerificationDocuments() {
    return this.providerService.listPendingVerificationDocuments();
  }

  async listProviders(params: { serviceAreaId?: string; cursor?: string; limit?: number }) {
    return this.providerService.listAll(params);
  }

  /** Ch137's Admin Console read path for the audit trail Phase 4/7 started
   * writing to. Cursor-based, per docs/api-conventions.md. */
  async listAuditLog(params: { cursor?: string; limit?: number }) {
    const limit = Math.min(params.limit ?? 25, 100);
    const entries = await this.prisma.auditLog.findMany({
      take: limit + 1,
      ...(params.cursor ? { cursor: { id: params.cursor }, skip: 1 } : {}),
      orderBy: { createdAt: "desc" },
      include: { actorUser: { select: { phone: true, role: true } } },
    });

    const hasMore = entries.length > limit;
    const page = hasMore ? entries.slice(0, limit) : entries;
    return {
      data: page,
      pagination: { nextCursor: hasMore ? page[page.length - 1].id : null, limit },
    };
  }

  async reviewVerificationDocument(
    documentId: string,
    adminUserId: string,
    decision: "APPROVED" | "REJECTED",
    notes?: string,
  ) {
    const document = await this.providerService.reviewVerificationDocument(
      documentId,
      adminUserId,
      decision,
      notes,
    );
    await this.recordAuditLog({
      actorUserId: adminUserId,
      action: `VERIFICATION_DOCUMENT_${decision}`,
      entityType: "ProviderVerificationDocument",
      entityId: documentId,
      metadata: { providerProfileId: document.providerProfileId, notes },
    });
    return document;
  }

  async updateProviderVerificationStatus(
    providerProfileId: string,
    adminUserId: string,
    status: ProviderVerificationStatus,
  ) {
    const before = await this.providerService.findById(providerProfileId);
    const updated = await this.providerService.transitionVerificationStatus(providerProfileId, status);
    await this.recordAuditLog({
      actorUserId: adminUserId,
      action: "PROVIDER_VERIFICATION_STATUS_CHANGED",
      entityType: "ProviderProfile",
      entityId: providerProfileId,
      metadata: { from: before.verificationStatus, to: status },
    });
    return updated;
  }

  /** Ch61/Ch137's admin manual-dispatch queue. */
  async listRequestsNeedingDispatch(params: { cursor?: string; limit?: number }) {
    return this.requestService.listNeedingDispatch(params);
  }

  /** Ch61's admin manual dispatch override — see
   * MatchingService.adminOverrideDispatch()'s doc comment for the guards
   * (same-city, verification eligibility) it applies before this ever runs. */
  async dispatchOverride(
    serviceRequestId: string,
    providerProfileId: string,
    adminUserId: string,
    reason?: string,
  ) {
    const assignment = await this.matchingService.adminOverrideDispatch(serviceRequestId, providerProfileId);
    await this.recordAuditLog({
      actorUserId: adminUserId,
      action: "REQUEST_DISPATCH_OVERRIDDEN",
      entityType: "ServiceRequest",
      entityId: serviceRequestId,
      metadata: { providerProfileId, assignmentId: assignment.id, reason },
    });
    return assignment;
  }

  /** Manual stand-in for Ch62's future recurring scheduler — see
   * ProviderService.sweepLapsedVerifications()'s doc comment. */
  async sweepLapsedProviderVerifications(adminUserId?: string) {
    const delistedProviderIds = await this.providerService.sweepLapsedVerifications();
    for (const providerProfileId of delistedProviderIds) {
      await this.recordAuditLog({
        actorUserId: adminUserId,
        action: "PROVIDER_DELISTED_LAPSED_REVERIFICATION",
        entityType: "ProviderProfile",
        entityId: providerProfileId,
      });
    }
    return { delistedCount: delistedProviderIds.length, delistedProviderIds };
  }
}
