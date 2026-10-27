import { ForbiddenException, Inject, Injectable, Logger, NotFoundException, ServiceUnavailableException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "../../common/prisma/prisma.service";
import { money } from "../../common/money";
import { SosService } from "../sos/sos.service";
import { ISSUE_CLASSIFIER, IssueClassifierPort } from "./ports/issue-classifier.port";
import { PROVIDER_RANKING, ProviderRankingPort } from "./ports/provider-ranking.port";
import { AI_ASSISTANT, AiAssistantPort } from "./ports/ai-assistant.port";
import { KeywordAssistantResponder } from "./adapters/keyword-assistant.responder";
import { detectEmergencyIntent } from "./emergency-intent.util";
import { IssueType } from "@motiq/types";
import { ClassificationResult } from "./issue-classifier.util";
import { LLM_CHAT, LlmChatPort } from "./llm/llm-chat.port";
import { CLASSIFY_SYSTEM_PROMPT, Diagnosis, PHOTO_SYSTEM_PROMPT, parseDiagnosis } from "./issue-diagnosis.util";
import { RankableCandidate, RankedCandidate } from "./provider-ranking.util";
import { estimateReplyCostUsd, hasExceededConversationCostCap } from "./ai-cost.util";

const DEFAULT_MAX_COST_USD_PER_CONVERSATION = "1.00";
const DEFAULT_MAX_MESSAGES_PER_CONVERSATION = 40;

/** What the app shows for a free-text or photo triage. `source` says whether a model or the
 * deterministic keyword fallback produced it (urgency/summary/advice exist only for "AI"). */
export type TriageResult = ClassificationResult &
  Partial<Pick<Diagnosis, "urgency" | "summary" | "advice">> & {
    source: "AI" | "KEYWORD";
  };

const EMERGENCY_FALLBACK_REPLY =
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
 * Ch90's SOS-redirect requirement (Phase 8, ADR 0021): detectEmergencyIntent()
 * stops the assistant from attempting to "handle" an emergency
 * conversationally, files a real SosAlert via SosService (a one-way call —
 * SosModule never imports AiModule, preserving ADR 0007's "SOS never goes
 * through AiCapability" rule for the direct/primary trigger path), and tells
 * the user to also contact real emergency services directly. Filing the
 * alert is best-effort on top of the reply, never blocking it — see
 * SosService.trigger()'s doc comment.
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
    @Inject(LLM_CHAT) private readonly llm: LlmChatPort,
    private readonly keywordResponder: KeywordAssistantResponder,
    private readonly sosService: SosService,
  ) {}

  /** Free-text triage. A model reads it (any language) when one is configured; otherwise, or if
   * the call fails or returns something unusable, the keyword classifier answers — it never gates
   * request creation either way (ADR 0007). */
  async classifyIssue(description: string): Promise<TriageResult> {
    if (this.llm.isConfigured()) {
      try {
        const result = await this.llm.chat({
          purpose: "agent",
          maxTokens: 300,
          messages: [
            { role: "system", content: CLASSIFY_SYSTEM_PROMPT },
            { role: "user", content: description.slice(0, 1000) },
          ],
        });
        const diagnosis = parseDiagnosis(result.content);
        if (diagnosis) {
          return { ...diagnosis, source: "AI" };
        }
        this.logger.warn("Issue triage model returned an unparseable reply — using the keyword classifier.");
      } catch (error) {
        this.logger.error(`Issue triage model call failed — using the keyword classifier: ${(error as Error).message}`);
      }
    }
    const keyword = await this.classifier.classifyIssueCategory(description);
    return { ...keyword, source: "KEYWORD" };
  }

  /** Photo triage — vision only, so there is no keyword fallback: when no model is available the
   * caller gets a 503 and the app simply asks the customer to pick the issue manually. */
  async diagnosePhoto(input: { imageBase64: string; mimeType: string; note?: string }): Promise<TriageResult> {
    if (!this.llm.isConfigured()) {
      throw new ServiceUnavailableException("Photo diagnosis isn't available right now. Please choose the issue yourself.");
    }
    try {
      const result = await this.llm.chat({
        purpose: "vision",
        maxTokens: 350,
        messages: [
          { role: "system", content: PHOTO_SYSTEM_PROMPT },
          {
            role: "user",
            content: [
              { type: "text", text: input.note ? `Driver's note: ${input.note.slice(0, 300)}` : "What is the problem in this photo?" },
              { type: "image_url", image_url: { url: `data:${input.mimeType};base64,${input.imageBase64}` } },
            ],
          },
        ],
      });
      const diagnosis = parseDiagnosis(result.content);
      if (diagnosis) {
        return { ...diagnosis, source: "AI" };
      }
      return {
        issueType: IssueType.OTHER,
        confidence: 0,
        urgency: "MEDIUM",
        summary: "I couldn't make out a vehicle problem in that photo.",
        advice: "Try a closer, well-lit photo, or choose the issue yourself.",
        source: "AI",
      };
    } catch (error) {
      this.logger.error(`Photo diagnosis model call failed: ${(error as Error).message}`);
      throw new ServiceUnavailableException("Photo diagnosis isn't available right now. Please choose the issue yourself.");
    }
  }

  // --- Helpers for the Ask MOTIQ agent (modules/agent). AiConversation is this module's data, so
  // the agent reads and writes it only through these methods (architecture rule 1). ---

  async getOwnedConversation(conversationId: string, userId: string) {
    const conversation = await this.prisma.aiConversation.findUnique({
      where: { id: conversationId },
      include: { messages: { orderBy: { createdAt: "asc" } } },
    });
    if (!conversation) {
      throw new NotFoundException(`AiConversation ${conversationId} not found.`);
    }
    if (conversation.userId !== userId) {
      throw new ForbiddenException("You can only use your own conversation.");
    }
    return conversation;
  }

  async appendMessage(conversationId: string, role: "USER" | "ASSISTANT", content: string) {
    await this.prisma.aiConversationMessage.create({ data: { conversationId, role, content } });
  }

  async flagConversation(conversationId: string, flags: { emergencyDetected?: boolean; escalated?: boolean }) {
    await this.prisma.aiConversation.update({ where: { id: conversationId }, data: flags });
  }

  /** Files a real SOS alert for an emergency typed into a chat (best-effort, never blocks the
   * reply) and returns the text to show — see the class doc comment. */
  async fileEmergencyAlert(userId: string): Promise<string> {
    try {
      const result = await this.sosService.trigger({ triggeredByUserId: userId, source: "AI_ASSISTANT" });
      return result.message;
    } catch (error) {
      this.logger.error(`Failed to file an SOS alert from the AI Assistant: ${(error as Error).message}`);
      return EMERGENCY_FALLBACK_REPLY;
    }
  }

  /** The deterministic FAQ answer — the agent's designed-default fallback. */
  faqReply(message: string): string {
    return this.keywordResponder.reply(message).reply;
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
      // Best-effort — filing the alert must never block the reply itself.
      // No location is available from a chat message, so this alert has
      // none; a device-triggered SOS button (the primary Ch55 path) sends one.
      const emergencyReply = await this.fileEmergencyAlert(userId);
      return this.persistAndReturn(conversationId, emergencyReply, { emergencyDetected: true });
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
