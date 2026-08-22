import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { EventEmitterModule } from "@nestjs/event-emitter";
import { PrismaModule } from "./common/prisma/prisma.module";
import { HealthModule } from "./modules/health/health.module";
import { ServiceAreaModule } from "./modules/service-area/service-area.module";
import { IdentityModule } from "./modules/identity/identity.module";
import { ProviderModule } from "./modules/provider/provider.module";
import { RequestModule } from "./modules/request/request.module";
import { MatchingModule } from "./modules/matching/matching.module";
import { PricingModule } from "./modules/pricing/pricing.module";
import { PaymentModule } from "./modules/payment/payment.module";
import { NotificationModule } from "./modules/notification/notification.module";
import { RatingModule } from "./modules/rating/rating.module";
import { AdminModule } from "./modules/admin/admin.module";
import { TrackingModule } from "./modules/tracking/tracking.module";

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
    PrismaModule,
    HealthModule,
    IdentityModule,
    ServiceAreaModule,
    ProviderModule,
    RequestModule,
    MatchingModule,
    PricingModule,
    PaymentModule,
    NotificationModule,
    RatingModule,
    AdminModule,
    TrackingModule,
  ],
})
export class AppModule {}
