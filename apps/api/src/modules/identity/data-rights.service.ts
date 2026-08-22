import { Injectable, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { randomUUID } from "crypto";
import { PrismaService } from "../../common/prisma/prisma.service";
import { decryptField } from "../../common/encryption.util";

/**
 * Ch126's binding requirement: "Data Principal rights (access, correction,
 * erasure) must be implementable via real endpoints, not just policy
 * language." This is a deliberate, bounded exception to ADR 0001's module-
 * boundary rule — a DPDP export is inherently cross-cutting by definition
 * (every module's data about one person, not one module's own aggregate),
 * so this reads several other modules' tables directly through Prisma
 * rather than round-tripping through each module's exported service. Not a
 * precedent for casual boundary violations elsewhere — see ADR 0020.
 */
@Injectable()
export class DataRightsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async exportOwnData(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        customerProfile: {
          include: {
            vehicles: true,
            serviceRequests: { include: { payment: true } },
            ratingsGiven: true,
          },
        },
        providerProfile: {
          include: {
            fleetVehicles: true,
            assignments: true,
            ratingsReceived: true,
            verificationDocuments: true,
            _count: { select: { locationPings: true } },
          },
        },
        adminProfile: true,
        notifications: true,
        pushDeviceTokens: true,
        notificationPreference: true,
        aiConversations: { include: { messages: true } },
        consentRecords: true,
      },
    });
    if (!user) {
      throw new NotFoundException(`User ${userId} not found.`);
    }

    // Never export secrets, even to the data owner — password hashes,
    // refresh-token hashes, and MFA secrets are not "the user's data" in the
    // DPDP-access sense, they're authentication material.
    const { passwordHash, ...userWithoutSecrets } = user;
    void passwordHash; // never exported, even to the data owner
    const adminProfile = user.adminProfile
      ? { ...user.adminProfile, mfaSecret: undefined }
      : null;

    const providerProfile = user.providerProfile
      ? {
          ...user.providerProfile,
          verificationDocuments: user.providerProfile.verificationDocuments.map((document) => ({
            ...document,
            fileUrl: this.tryDecrypt(document.fileUrl),
          })),
          locationPingCount: user.providerProfile._count.locationPings,
        }
      : null;

    return {
      exportedAt: new Date().toISOString(),
      ...userWithoutSecrets,
      adminProfile,
      providerProfile,
    };
  }

  /**
   * Ch131's resolution of "soft-delete vs. hard-delete" (reconciling Ch42's
   * retention rules with Ch126's erasure rights): anonymize rather than hard-
   * delete. Financial records (Payment, AuditLog) and completed transaction
   * history (ServiceRequest, Assignment, Rating) that other parties'
   * accounts still reference are never removed — only this user's own
   * directly-identifying fields are. See ADR 0020 for the full reasoning.
   */
  async eraseOwnAccount(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { customerProfile: true, providerProfile: true, adminProfile: true },
    });
    if (!user) {
      throw new NotFoundException(`User ${userId} not found.`);
    }

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: {
          phone: `erased-${randomUUID()}`,
          email: null,
          passwordHash: null,
          isActive: false,
        },
      }),
      this.prisma.refreshToken.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
      ...(user.customerProfile
        ? [
            this.prisma.customerProfile.update({
              where: { id: user.customerProfile.id },
              data: { displayName: "Erased User" },
            }),
          ]
        : []),
      ...(user.providerProfile
        ? [
            this.prisma.providerProfile.update({
              where: { id: user.providerProfile.id },
              data: { businessName: "Erased Provider" },
            }),
          ]
        : []),
      ...(user.adminProfile
        ? [
            this.prisma.adminProfile.update({
              where: { id: user.adminProfile.id },
              data: { mfaSecret: null, mfaEnabled: false },
            }),
          ]
        : []),
    ]);

    return { erased: true };
  }

  private tryDecrypt(ciphertext: string): string {
    try {
      return decryptField(ciphertext, this.config.get<string>("ENCRYPTION_MASTER_KEY"));
    } catch {
      return "[unavailable — encryption key not configured]";
    }
  }
}
