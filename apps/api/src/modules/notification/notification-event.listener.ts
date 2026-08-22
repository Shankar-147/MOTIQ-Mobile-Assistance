import { Injectable, Logger } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";
import { NotificationChannel, NotificationDeliveryTier } from "@motiq/types";
import { PrismaService } from "../../common/prisma/prisma.service";
import { DomainEvents, ProviderAssignedEvent, PaymentSettledEvent, RatingSubmittedEvent, RequestCreatedEvent } from "../../common/events/domain-events";
import { NotificationService } from "./notification.service";

/**
 * Ch59/Ch79's cross-module notification fan-out, wired the same way as
 * Matching/Payment (ADR 0013) — via domain events, never a direct import of
 * RequestModule/MatchingModule/PaymentModule/RatingModule into
 * NotificationModule. Every send here is BEST_EFFORT: none of these are the
 * SOS/safety path (Ch79's CRITICAL carve-out), so preference/quiet-hours
 * suppression is allowed to apply.
 */
@Injectable()
export class NotificationEventListener {
  private readonly logger = new Logger(NotificationEventListener.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationService,
  ) {}

  @OnEvent(DomainEvents.RequestCreated)
  async onRequestCreated(event: RequestCreatedEvent) {
    const request = await this.prisma.serviceRequest.findUnique({
      where: { id: event.serviceRequestId },
      include: { customerProfile: true },
    });
    if (!request) {
      return;
    }
    await this.safeSend({
      userId: request.customerProfile.userId,
      channel: NotificationChannel.PUSH,
      category: "request_received",
      deliveryTier: NotificationDeliveryTier.BEST_EFFORT,
      title: "We're finding you a provider",
      body: "Your service request has been received — we're matching you with a nearby provider.",
      payload: { serviceRequestId: event.serviceRequestId },
    });
  }

  @OnEvent(DomainEvents.ProviderAssigned)
  async onProviderAssigned(event: ProviderAssignedEvent) {
    const provider = await this.prisma.providerProfile.findUnique({
      where: { id: event.providerProfileId },
    });
    if (!provider) {
      return;
    }
    await this.safeSend({
      userId: provider.userId,
      channel: NotificationChannel.PUSH,
      category: "job_offer",
      deliveryTier: NotificationDeliveryTier.BEST_EFFORT,
      title: "New job offer",
      body: "You have a new service request offer waiting — accept it before it expires.",
      payload: { serviceRequestId: event.serviceRequestId, assignmentId: event.assignmentId },
    });
  }

  @OnEvent(DomainEvents.PaymentSettled)
  async onPaymentSettled(event: PaymentSettledEvent) {
    const request = await this.prisma.serviceRequest.findUnique({
      where: { id: event.serviceRequestId },
      include: { customerProfile: true },
    });
    if (!request) {
      return;
    }
    await this.safeSend({
      userId: request.customerProfile.userId,
      channel: NotificationChannel.PUSH,
      category: "payment_settled",
      deliveryTier: NotificationDeliveryTier.BEST_EFFORT,
      title: "Payment complete",
      body: "Your payment for this service request has been processed. Thanks for riding with MOTIQ.",
      payload: { serviceRequestId: event.serviceRequestId, paymentId: event.paymentId },
    });
  }

  @OnEvent(DomainEvents.RatingSubmitted)
  async onRatingSubmitted(event: RatingSubmittedEvent) {
    const provider = await this.prisma.providerProfile.findUnique({
      where: { id: event.providerProfileId },
    });
    if (!provider) {
      return;
    }
    await this.safeSend({
      userId: provider.userId,
      channel: NotificationChannel.PUSH,
      category: "new_rating",
      deliveryTier: NotificationDeliveryTier.BEST_EFFORT,
      title: "You received a new rating",
      body: "A customer just rated your completed job.",
      payload: { serviceRequestId: event.serviceRequestId },
    });
  }

  private async safeSend(params: Parameters<NotificationService["send"]>[0]) {
    try {
      await this.notifications.send(params);
    } catch (error) {
      // Notification delivery must never break the transaction flow it's
      // reacting to (ADR 0007's "additive, never load-bearing" spirit
      // applied to notifications, not just AI).
      this.logger.error(`Notification dispatch failed for category ${params.category}: ${(error as Error).message}`);
    }
  }
}
