import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { PrismaModule } from "./common/prisma/prisma.module";
import { HealthModule } from "./modules/health/health.module";
import { ServiceAreaModule } from "./modules/service-area/service-area.module";
import { IdentityModule } from "./modules/identity/identity.module";
import { ProviderModule } from "./modules/provider/provider.module";
import { RequestModule } from "./modules/request/request.module";
import { MatchingModule } from "./modules/matching/matching.module";
import { PaymentModule } from "./modules/payment/payment.module";
import { NotificationModule } from "./modules/notification/notification.module";
import { RatingModule } from "./modules/rating/rating.module";
import { AdminModule } from "./modules/admin/admin.module";

/**
 * One NestJS module per Ch24 bounded context (ADR 0001). No module imports
 * another module's PrismaService-backed repository directly — cross-module
 * calls go through an exported service. See docs/architecture.md §1.
 */
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    HealthModule,
    IdentityModule,
    ServiceAreaModule,
    ProviderModule,
    RequestModule,
    MatchingModule,
    PaymentModule,
    NotificationModule,
    RatingModule,
    AdminModule,
  ],
})
export class AppModule {}
