import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { ConfigModule } from "@nestjs/config";
import { EventEmitterModule } from "@nestjs/event-emitter";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { JwtService } from "@nestjs/jwt";
import { PrismaModule } from "./common/prisma/prisma.module";
import { resolveThrottleTracker } from "./common/throttle-tracker.util";
import { HealthModule } from "./modules/health/health.module";
import { ServiceAreaModule } from "./modules/service-area/service-area.module";
import { IdentityModule } from "./modules/identity/identity.module";
import { ProviderModule } from "./modules/provider/provider.module";
import { CustomerModule } from "./modules/customer/customer.module";
import { RequestModule } from "./modules/request/request.module";
import { MatchingModule } from "./modules/matching/matching.module";
import { PricingModule } from "./modules/pricing/pricing.module";
import { PaymentModule } from "./modules/payment/payment.module";
import { NotificationModule } from "./modules/notification/notification.module";
import { RatingModule } from "./modules/rating/rating.module";
import { AdminModule } from "./modules/admin/admin.module";
import { TrackingModule } from "./modules/tracking/tracking.module";
import { AiModule } from "./modules/ai/ai.module";
import { ConsentModule } from "./modules/consent/consent.module";
import { SosModule } from "./modules/sos/sos.module";

/**
 * One NestJS module per Ch24 bounded context (ADR 0001). No module imports
 * another module's PrismaService-backed repository directly — cross-module
 * calls go through an exported service. See docs/architecture.md §1.
 *
 * EventEmitterModule (Ch31's event backbone, in-process adapter per ADR 0009)
 * is how Request/Matching/Payment react to each other without importing one
 * another's modules — see docs/decisions/0013-*.md.
 */
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    EventEmitterModule.forRoot(),
    // Ch95 — global default rate limit, per-user (not just per-IP) via
    // resolveThrottleTracker (ADR 0020). Individual endpoints layer a
    // tighter @Throttle() limit on top where the sensitivity warrants it
    // (OTP request/verify, admin login, AI Assistant messages).
    ThrottlerModule.forRootAsync({
      inject: [JwtService],
      useFactory: (jwtService: JwtService) => ({
        throttlers: [{ name: "default", ttl: 60_000, limit: 100 }],
        getTracker: (req: Record<string, unknown>) => {
          const headers = req.headers as Record<string, string | undefined> | undefined;
          return resolveThrottleTracker(
            headers?.authorization,
            (token) => {
              const decoded = jwtService.decode(token) as { sub?: string } | null;
              return decoded?.sub ?? null;
            },
            (req.ip as string) ?? "unknown",
          );
        },
      }),
    }),
    PrismaModule,
    HealthModule,
    IdentityModule,
    ServiceAreaModule,
    ProviderModule,
    CustomerModule,
    RequestModule,
    MatchingModule,
    PricingModule,
    PaymentModule,
    NotificationModule,
    RatingModule,
    AdminModule,
    TrackingModule,
    AiModule,
    ConsentModule,
    SosModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
