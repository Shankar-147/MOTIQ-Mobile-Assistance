import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import Anthropic from "@anthropic-ai/sdk";
import { AiAssistantPort, AssistantReplyInput, AssistantReplyResult } from "../ports/ai-assistant.port";

const DEFAULT_MODEL = "claude-sonnet-4-5";
const MAX_OUTPUT_TOKENS = 512;

/**
 * Ch90's real LLM provider, behind AiAssistantPort (Ch32). No API key is
 * configured in this bootstrap phase (ANTHROPIC_API_KEY is blank in
 * .env.example) — degrades to isConfigured() === false, the same pattern as
 * every other unconfigured adapter in this codebase (Razorpay, Twilio, FCM).
 *
 * The system prompt is the "grounding" Ch90 requires: it scopes the
 * assistant to MOTIQ's own policy content (the same FAQ set
 * KeywordAssistantResponder uses as its fallback) and explicitly forbids
 * answering outside roadside-assistance topics — a real hallucination
 * guardrail, not just a fallback-path formality. Emergency-intent detection
 * is NOT this adapter's job — see ai.service.ts, which runs
 * detectEmergencyIntent() before this is ever called.
 */
const SYSTEM_PROMPT = `You are the MOTIQ roadside-assistance app's support assistant. Only answer
questions about: creating/tracking a service request, payments and receipts,
provider verification and ratings, and general app usage. If asked about
anything else, politely say it's outside what you can help with and suggest
"Contact support". Never provide medical, legal, or emergency-response
advice — if a message describes a genuine emergency, tell the user to
contact local emergency services immediately (this case is normally caught
before reaching you, but if it wasn't, treat it as an emergency, not a
support question). Keep replies under 4 sentences.`;

@Injectable()
export class AnthropicAssistantAdapter implements AiAssistantPort {
  private readonly logger = new Logger(AnthropicAssistantAdapter.name);
  private readonly client: Anthropic | null;
  private readonly model: string;

  constructor(config: ConfigService) {
    const apiKey = config.get<string>("ANTHROPIC_API_KEY");
    this.client = apiKey ? new Anthropic({ apiKey }) : null;
    this.model = config.get<string>("AI_ASSISTANT_MODEL", DEFAULT_MODEL);

    if (!this.client) {
      this.logger.warn(
        "ANTHROPIC_API_KEY not set — the AI Assistant falls back to KeywordAssistantResponder's " +
          "FAQ-only replies (Ch32) until this is configured.",
      );
    }
  }

  isConfigured(): boolean {
    return this.client !== null;
  }

  async assistantReply(input: AssistantReplyInput): Promise<AssistantReplyResult> {
    if (!this.client) {
      throw new Error("AnthropicAssistantAdapter is not configured — check isConfigured() first.");
    }

    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: MAX_OUTPUT_TOKENS,
      system: SYSTEM_PROMPT,
      messages: [
        ...input.conversationHistory.map((entry) => ({
          role: entry.role === "USER" ? ("user" as const) : ("assistant" as const),
          content: entry.content,
        })),
        { role: "user" as const, content: input.message },
      ],
    });

    const textBlock = response.content.find((block) => block.type === "text");
    return {
      reply: textBlock?.type === "text" ? textBlock.text : "",
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
    };
  }
}
