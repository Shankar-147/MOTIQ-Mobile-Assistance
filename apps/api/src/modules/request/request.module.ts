import { Module } from "@nestjs/common";
import { ConsentModule } from "../consent/consent.module";
import { RequestController } from "./request.controller";
import { RequestService } from "./request.service";

/** Owns the Ch19 state machine. See ADR 0004. Imports ConsentModule to gate
 * request creation on Ch128's location-tracking consent — see RequestController. */
@Module({
  imports: [ConsentModule],
  controllers: [RequestController],
  providers: [RequestService],
  exports: [RequestService],
})
export class RequestModule {}
