import { Injectable, Logger } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { NotificationChannel, NotificationDeliveryTier } from "@motiq/types";
import { PrismaService } from "../../common/prisma/prisma.service";

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Console/log adapter only in this bootstrap phase — no real SMS/push
   * provider is wired (Ch32 is out of scope here). The delivery-tier
   * distinction is still enforced in the data model so CRITICAL (SOS/safety)
   * notifications are never modeled as droppable, even before a real
   * provider exists.
   */
  async send(params: {
    userId: string;
    channel: NotificationChannel;
    category: string;
    deliveryTier: NotificationDeliveryTier;
    payload: Record<string, unknown>;
  }) {
    const record = await this.prisma.notification.create({
      data: {
        userId: params.userId,
        channel: params.channel as unknown as never,
        category: params.category,
        deliveryTier: params.deliveryTier as unknown as never,
        payload: params.payload as Prisma.InputJsonValue,
        status: "SENT",
        sentAt: new Date(),
      },
    });
    this.logger.log(`[${params.deliveryTier}] ${params.channel} -> ${params.userId}: ${params.category}`);
    return record;
  }
}
