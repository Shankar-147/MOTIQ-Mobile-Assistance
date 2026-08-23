import { Module } from "@nestjs/common";
import { NotificationModule } from "../notification/notification.module";
import { SosService } from "./sos.service";
import { SosController } from "./sos.controller";

/**
 * Ch55's SOS/Safety Service — owns SosAlert. Deliberately does NOT import
 * AiModule (ADR 0007's binding rule: SOS never goes through AiCapability).
 * AiModule imports THIS module instead, one-way, so the assistant's
 * emergency pre-filter can also file a real alert — see ADR 0021.
 */
@Module({
  imports: [NotificationModule],
  controllers: [SosController],
  providers: [SosService],
  exports: [SosService],
})
export class SosModule {}
