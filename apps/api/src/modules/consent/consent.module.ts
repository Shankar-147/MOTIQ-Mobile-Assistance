import { Module } from "@nestjs/common";
import { ConsentService } from "./consent.service";
import { ConsentController } from "./consent.controller";

/**
 * Owns ConsentRecord (Ch128). RequestModule and ProviderModule depend on
 * ConsentService (exported below) to gate location collection — never a
 * direct import of another module's Prisma model, per ADR 0001.
 */
@Module({
  controllers: [ConsentController],
  providers: [ConsentService],
  exports: [ConsentService],
})
export class ConsentModule {}
