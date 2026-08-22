import { Body, Controller, Param, Post, UseGuards } from "@nestjs/common";
import { AuthenticatedUser, UserRole } from "@motiq/types";
import { CurrentUser } from "../identity/auth/decorators/current-user.decorator";
import { JwtAuthGuard } from "../identity/auth/guards/jwt-auth.guard";
import { Roles } from "../identity/auth/decorators/roles.decorator";
import { RolesGuard } from "../identity/auth/guards/roles.guard";
import { AiService } from "./ai.service";
import { ClassifyIssueDto } from "./dto/classify-issue.dto";
import { SendAssistantMessageDto } from "./dto/send-assistant-message.dto";

@Controller("ai")
@UseGuards(JwtAuthGuard, RolesGuard)
export class AiController {
  constructor(private readonly aiService: AiService) {}

  // Ch83 — a suggestion only; the customer still picks issueType explicitly
  // on CreateServiceRequestDto (ADR 0007's binding fallback).
  @Post("classify-issue")
  @Roles(UserRole.CUSTOMER)
  classifyIssue(@Body() dto: ClassifyIssueDto) {
    return this.aiService.classifyIssue(dto.description);
  }

  // Ch90 — Customer/Provider only; Admin/Support use the Admin Console's own
  // support tooling, not this end-user assistant.
  @Post("assistant/conversations")
  @Roles(UserRole.CUSTOMER, UserRole.PROVIDER)
  startConversation(@CurrentUser() user: AuthenticatedUser) {
    return this.aiService.startConversation(user.userId);
  }

  @Post("assistant/conversations/:id/messages")
  @Roles(UserRole.CUSTOMER, UserRole.PROVIDER)
  sendMessage(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") conversationId: string,
    @Body() dto: SendAssistantMessageDto,
  ) {
    return this.aiService.sendMessage(conversationId, user.userId, dto.message);
  }
}
