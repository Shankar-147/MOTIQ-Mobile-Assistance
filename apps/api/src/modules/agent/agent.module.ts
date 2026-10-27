import { Module } from "@nestjs/common";
import { AiModule } from "../ai/ai.module";
import { VehicleModule } from "../vehicle/vehicle.module";
import { RequestModule } from "../request/request.module";
import { AgentController } from "./agent.controller";
import { AgentService } from "./agent.service";
import { AgentToolsService } from "./agent-tools";
import { PendingActionsStore } from "./pending-actions.store";

/**
 * Ask MOTIQ (ADR 0023). A leaf module on purpose: it consumes AiModule, VehicleModule and
 * RequestModule through their exported services and nothing imports it back, so it cannot create
 * a module cycle (ADR 0001/0013).
 */
@Module({
  imports: [AiModule, VehicleModule, RequestModule],
  controllers: [AgentController],
  providers: [AgentService, AgentToolsService, PendingActionsStore],
})
export class AgentModule {}
