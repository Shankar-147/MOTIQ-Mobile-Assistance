import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { ProviderVerificationStatus } from "@motiq/types";
import { PrismaService } from "../../common/prisma/prisma.service";
import { ProviderService } from "../provider/provider.service";

/**
 * Ch61's "provider-verification workflow backend" — the Admin-facing
 * orchestration layer. Provider owns the underlying entities
 * (ProviderVerificationDocument, ProviderProfile.verificationStatus) and the
 * guarded state machine (Ch98, ADR 0016); this service delegates the actual
 * mutation to ProviderService and adds what Admin owns: the audit trail.
 */
@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly providerService: ProviderService,
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
