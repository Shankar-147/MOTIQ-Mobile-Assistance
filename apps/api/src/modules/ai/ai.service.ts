import { ForbiddenException, Inject, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "../../common/prisma/prisma.service";
import { money } from "../../common/money";
import { ISSUE_CLASSIFIER, IssueClassifierPort } from "./ports/issue-classifier.port";
import { PROVIDER_RANKING, ProviderRankingPort } from "./ports/provider-ranking.port";
import { AI_ASSISTANT, AiAssistantPort } from "./ports/ai-assistant.port";
import { KeywordAssistantResponder } from "./adapters/keyword-assistant.responder";
import { detectEmergencyIntent } from "./emergency-intent.util";
import { ClassificationResult } from "./issue-classifier.util";
import { RankableCandidate, RankedCandidate } from "./provider-ranking.util";
import { estimateReplyCostUsd, hasExceededConversationCostCap } from "./ai-cost.util";

const DEFAULT_MAX_COST_USD_PER_CONVERSATION = "1.00";
const DEFAULT_MAX_MESSAGES_PER_CONVERSATION = 40;

const EMERGENCY_REPLY =
  "This sounds like it may be an emergency. Please contact your local emergency services " +
  "immediately (e.g. dial 112 in India) — this assistant is not a substitute for emergency response.";
const COST_CAP_REPLY =
  "This conversation has reached its automatic length limit. Please start a new conversation, " +
  "or use 'Contact support' to reach a human agent.";

/**
 * Ch80's unifying AI serving surface — the concrete implementation of the
 * `AiCapability` port ADR 0007 describes. Every method here has a
 * deterministic fallback in the SAME code path, per that ADR: classification
 * degrades to OTHER/low-confidence (never gates request creation, since
 * CreateServiceRequestDto's issueType is always the customer's own manual
 * choice), ranking degrades to the caller's original distance-sort order
 * (see MatchingService.dispatch()'s try/catch), and the assistant degrades
 * to KeywordAssistantResponder's FAQ-only replies.
 *
 * Ch90's SOS-redirect requirement is only partially satisfiable here: Ch55
 * (the actual SOS path) does not exist yet in this codebase, so
 * detectEmergencyIntent() can stop the assistant from attempting to "handle"
 * an emergency conversationally (the part that IS achievable now), but it
 * can only tell the user to contact real emergency services directly — it
 * cannot literally redirect into a SOS flow that hasn't been built. This gap
 * is deliberate and documented, not silently worked around — see ADR 0019.
 */
@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    @Inject(ISSUE_CLASSIFIER) private readonly classifier: IssueClassifierPort,
    @Inject(PROVIDER_RANKING) private readonly ranking: ProviderRankingPort,
    @Inject(AI_ASSISTANT) private readonly assistant: AiAssistantPort,
    private readonly keywordResponder: KeywordAssistantResponder,
  ) {}

  async classifyIssue(description: string): Promise<ClassificationResult> {
    return this.classifier.classifyIssueCategory(description);
  }

  async rankProviders(candidates: RankableCandidate[]): Promise<RankedCandidate[]> {
    return this.ranking.rankProviders(candidates);
  }

  async startConversation(userId: string) {
    return this.prisma.aiConversation.create({ data: { userId } });
  }

  async sendMessage(conversationId: string, userId: string, message: string) {
    const conversation = await this.prisma.aiConversation.findUnique({
      where: { id: conversationId },
      include: { messages: { orderBy: { createdAt: "asc" } } },
    });
    if (!conversation) {
      throw new NotFoundException(`AiConversation ${conversationId} not found.`);
    }
    if (conversation.userId !== userId) {
      throw new ForbiddenException("You can only send messages in your own conversation.");
    }

    await this.prisma.aiConversationMessage.create({
      data: { conversationId, role: "USER", content: message },
    });

    // Ch90's binding rule: this runs before ANY conversational response,
    // and short-circuits the AI call entirely if it fires.
    if (detectEmergencyIntent(message)) {
      await this.prisma.aiConversation.update({
        where: { id: conversationId },
        data: { emergencyDetected: true },
      });
      return this.persistAndReturn(conversationId, EMERGENCY_REPLY, { emergencyDetected: true });
    }

    const maxMessages = Number(
      this.config.get("AI_ASSISTANT_MAX_MESSAGES_PER_CONVERSATION", DEFAULT_MAX_MESSAGES_PER_CONVERSATION),
    );
    const capUsd = money(
      this.config.get("AI_ASSISTANT_MAX_COST_USD_PER_CONVERSATION", DEFAULT_MAX_COST_USD_PER_CONVERSATION),
    );
    if (
      conversation.messages.length >= maxMessages ||
      hasExceededConversationCostCap(conversation.estimatedCostUsd, capUsd)
    ) {
      await this.prisma.aiConversation.update({ where: { id: conversationId }, data: { escalated: true } });
      return this.persistAndReturn(conversationId, COST_CAP_REPLY, { escalated: true });
    }

    const history = conversation.messages.map((entry) => ({
      role: entry.role as "USER" | "ASSISTANT",
      content: entry.content,
    }));

    if (this.assistant.isConfigured()) {
      try {
        const result = await this.assistant.assistantReply({ conversationHistory: history, message });
        const cost = estimateReplyCostUsd({
          inputTokens: result.inputTokens,
          outputTokens: result.outputTokens,
        });
        await this.prisma.aiConversation.update({
          where: { id: conversationId },
          data: { estimatedCostUsd: conversation.estimatedCostUsd.add(cost) },
        });
        return this.persistAndReturn(conversationId, result.reply, {});
      } catch (error) {
        this.logger.error(
          `AnthropicAssistantAdapter call failed, falling back to KeywordAssistantResponder: ${(error as Error).message}`,
        );
      }
    }

    const fallback = this.keywordResponder.reply(message);
    return this.persistAndReturn(conversationId, fallback.reply, {});
  }

  private async persistAndReturn(
    conversationId: string,
    reply: string,
    flags: { emergencyDetected?: boolean; escalated?: boolean },
  ) {
    await this.prisma.aiConversationMessage.create({
      data: { conversationId, role: "ASSISTANT", content: reply },
    });
    return { reply, emergencyDetected: !!flags.emergencyDetected, escalated: !!flags.escalated };
  }
}
