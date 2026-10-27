import { Body, Controller, Param, ParseUUIDPipe, Post, UseGuards } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { AuthenticatedUser, UserRole } from "@motiq/types";
import { CurrentUser } from "../identity/auth/decorators/current-user.decorator";
import { JwtAuthGuard } from "../identity/auth/guards/jwt-auth.guard";
import { Roles } from "../identity/auth/decorators/roles.decorator";
import { RolesGuard } from "../identity/auth/guards/roles.guard";
import { AgentService } from "./agent.service";
import { SendAgentMessageDto } from "./dto/send-agent-message.dto";

/** Ask MOTIQ — the customer-facing AI agent. Customers only: it reads and (with confirmation)
 * writes the customer's own vehicle data, identified by the session, never by a request field. */
@Controller("ai/agent")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.CUSTOMER)
export class AgentController {
  constructor(private readonly agentService: AgentService) {}

  @Post("messages")
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  sendMessage(@CurrentUser() user: AuthenticatedUser, @Body() dto: SendAgentMessageDto) {
    return this.agentService.handleMessage(user, dto);
  }

  @Post("actions/:id/confirm")
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  confirm(@CurrentUser() user: AuthenticatedUser, @Param("id", ParseUUIDPipe) id: string) {
    return this.agentService.confirmAction(user, id);
  }

  @Post("actions/:id/cancel")
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  cancel(@CurrentUser() user: AuthenticatedUser, @Param("id", ParseUUIDPipe) id: string) {
    return this.agentService.cancelAction(user, id);
  }
}
