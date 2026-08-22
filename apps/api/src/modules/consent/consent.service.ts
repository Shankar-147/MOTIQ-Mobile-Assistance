import { ForbiddenException, Injectable } from "@nestjs/common";
import { ConsentType } from "@motiq/types";
import { PrismaService } from "../../common/prisma/prisma.service";

/**
 * Ch128's explicit, versioned consent with an audit trail — required before
 * MOTIQ collects a user's location. `CURRENT_CONSENT_VERSION` bumping (a
 * future change to the consent copy) invalidates every prior grant without
 * deleting the history of what was previously agreed to (Ch128's "consent
 * versioning"). See ADR 0020.
 */
const CURRENT_CONSENT_VERSION = 1;

@Injectable()
export class ConsentService {
  constructor(private readonly prisma: PrismaService) {}

  async grant(userId: string, consentType: ConsentType) {
    return this.prisma.consentRecord.create({
      data: { userId, consentType: consentType as unknown as never, version: CURRENT_CONSENT_VERSION },
    });
  }

  async revoke(userId: string, consentType: ConsentType) {
    await this.prisma.consentRecord.updateMany({
      where: { userId, consentType: consentType as unknown as never, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return { revoked: true };
  }

  async hasActiveConsent(userId: string, consentType: ConsentType): Promise<boolean> {
    const record = await this.prisma.consentRecord.findFirst({
      where: { userId, consentType: consentType as unknown as never, revokedAt: null },
      orderBy: { grantedAt: "desc" },
    });
    return !!record && record.version === CURRENT_CONSENT_VERSION;
  }

  /** Throws if consent is missing/revoked/stale-versioned — the real gate
   * RequestService/ProviderService call before collecting a location. */
  async requireConsent(userId: string, consentType: ConsentType): Promise<void> {
    if (!(await this.hasActiveConsent(userId, consentType))) {
      throw new ForbiddenException(
        `${consentType} consent is required before this action (Ch128) — grant it via POST /consent/location-tracking.`,
      );
    }
  }

  async listOwn(userId: string) {
    return this.prisma.consentRecord.findMany({ where: { userId }, orderBy: { grantedAt: "desc" } });
  }
}
