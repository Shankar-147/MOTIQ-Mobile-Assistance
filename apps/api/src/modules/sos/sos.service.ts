import { ForbiddenException, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NotificationChannel, NotificationDeliveryTier, SosAlertStatus } from "@motiq/types";
import { UserRole as PrismaUserRole } from "@prisma/client";
import { PrismaService } from "../../common/prisma/prisma.service";
import { NotificationService } from "../notification/notification.service";
import { assertValidSosAlertTransition } from "./sos-state-machine";

const DEFAULT_EMERGENCY_SERVICES_NUMBER = "112"; // India's unified emergency number.

/**
 * Ch55's SOS/Safety Service — the platform's highest-priority path.
 * Deliberately does NOT import AiModule or go through AiService/AiCapability
 * at all (ADR 0007's binding rule: "an AI system optimizing for helpful
 * conversation must never be permitted to substitute for the SOS path" —
 * this is the direct-wiring side of that rule; AiService is instead allowed
 * to call INTO this service as a one-way safety-net addition, see ADR 0021).
 *
 * This is an internal escalation to MOTIQ's own Admin/Support team, not a
 * dispatch to real emergency services — no software integration here can
 * actually call police/ambulance. Every trigger response tells the user to
 * contact real emergency services directly; this is additive, not a
 * substitute.
 */
@Injectable()
export class SosService {
  private readonly logger = new Logger(SosService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly notifications: NotificationService,
  ) {}

  async trigger(params: {
    triggeredByUserId: string;
    latitude?: number;
    longitude?: number;
    serviceRequestId?: string;
    source: string;
  }) {
    const alert = await this.prisma.sosAlert.create({
      data: {
        triggeredByUserId: params.triggeredByUserId,
        latitude: params.latitude,
        longitude: params.longitude,
        serviceRequestId: params.serviceRequestId,
        source: params.source,
      },
    });

    // Ch55: bypasses everything else, fans out immediately to every
    // Admin/Support account. A failure notifying any one admin must never
    // fail the trigger itself — the alert record existing IS the safety
    // guarantee; notification is best-effort on top of it.
    this.notifyAdminsAndSupport(alert.id, params).catch((error) => {
      this.logger.error(`Failed to fan out SOS notifications for alert ${alert.id}: ${(error as Error).message}`);
    });

    const emergencyNumber = this.config.get<string>(
      "EMERGENCY_SERVICES_NUMBER",
      DEFAULT_EMERGENCY_SERVICES_NUMBER,
    );

    return {
      alertId: alert.id,
      message: `MOTIQ's safety team has been alerted. If you are in immediate danger, contact local emergency services right now (e.g. dial ${emergencyNumber} in India) — do not wait for a reply here.`,
    };
  }

  async listAlerts() {
    return this.prisma.sosAlert.findMany({
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      include: { triggeredByUser: { select: { phone: true, role: true } } },
    });
  }

  async acknowledge(alertId: string, adminUserId: string) {
    const alert = await this.findByIdOrThrow(alertId);
    assertValidSosAlertTransition(alert.status as unknown as SosAlertStatus, SosAlertStatus.ACKNOWLEDGED);
    return this.prisma.sosAlert.update({
      where: { id: alertId },
      data: {
        status: SosAlertStatus.ACKNOWLEDGED as unknown as never,
        acknowledgedByUserId: adminUserId,
        acknowledgedAt: new Date(),
      },
    });
  }

  async resolve(
    alertId: string,
    outcome: SosAlertStatus.RESOLVED | SosAlertStatus.FALSE_ALARM,
    notes?: string,
  ) {
    const alert = await this.findByIdOrThrow(alertId);
    assertValidSosAlertTransition(alert.status as unknown as SosAlertStatus, outcome);
    return this.prisma.sosAlert.update({
      where: { id: alertId },
      data: { status: outcome as unknown as never, resolvedAt: new Date(), resolutionNotes: notes },
    });
  }

  private async findByIdOrThrow(alertId: string) {
    const alert = await this.prisma.sosAlert.findUnique({ where: { id: alertId } });
    if (!alert) {
      throw new NotFoundException(`SosAlert ${alertId} not found.`);
    }
    return alert;
  }

  /** Ownership check for a non-Admin caller reading their own alert history —
   * not currently exposed via a route, kept for the mobile "my SOS history"
   * feature this phase doesn't build a screen for yet. */
  async assertOwnedByOrThrow(alertId: string, userId: string) {
    const alert = await this.findByIdOrThrow(alertId);
    if (alert.triggeredByUserId !== userId) {
      throw new ForbiddenException("You can only view your own SOS alerts.");
    }
    return alert;
  }

  private async notifyAdminsAndSupport(
    alertId: string,
    params: { latitude?: number; longitude?: number; serviceRequestId?: string },
  ) {
    const admins = await this.prisma.user.findMany({
      where: { role: { in: [PrismaUserRole.ADMIN, PrismaUserRole.SUPPORT] }, isActive: true },
      select: { id: true },
    });

    const locationText =
      params.latitude !== undefined && params.longitude !== undefined
        ? `${params.latitude.toFixed(5)}, ${params.longitude.toFixed(5)}`
        : "unknown";

    await Promise.all(
      admins.map((admin) =>
        this.notifications.send({
          userId: admin.id,
          channel: NotificationChannel.PUSH,
          category: "sos_alert",
          deliveryTier: NotificationDeliveryTier.CRITICAL,
          title: "SOS ALERT",
          body: `A user triggered an SOS alert at ${locationText}. Open the Admin Console SOS queue immediately.`,
          payload: { alertId, serviceRequestId: params.serviceRequestId },
        }),
      ),
    );
  }
}
