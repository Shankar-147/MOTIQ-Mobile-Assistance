import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { LlmChatPort, LlmChatRequest, LlmChatResult, LlmToolCall } from "./llm-chat.port";

const DEFAULT_BASE_URL = "https://openrouter.ai/api/v1";
// Overridable per environment (AI_AGENT_MODEL / AI_VISION_MODEL). The vision model must accept
// image input; the agent model must support tool calling.
const DEFAULT_AGENT_MODEL = "openai/gpt-4o-mini";
const DEFAULT_VISION_MODEL = "openai/gpt-4o-mini";
const DEFAULT_MAX_TOKENS = 700;
const REQUEST_TIMEOUT_MS = 45_000;

interface OpenRouterResponse {
  choices?: { message?: { content?: string | null; tool_calls?: LlmToolCall[] } }[];
  usage?: { prompt_tokens?: number; completion_tokens?: number };
  error?: { message?: string };
}

/**
 * The OpenRouter-backed LlmChatPort (OpenAI-compatible chat completions with tool calling and
 * image input). Reads OPENROUTER_API_KEY at construction; without it the port reports
 * `isConfigured() === false` and every caller degrades to its deterministic fallback — the same
 * pattern as the other unconfigured third-party adapters (Razorpay, Twilio, FCM, Anthropic).
 */
@Injectable()
export class OpenRouterChatClient implements LlmChatPort {
  private readonly logger = new Logger(OpenRouterChatClient.name);
  private readonly apiKey: string | undefined;
  private readonly baseUrl: string;
  private readonly agentModel: string;
  private readonly visionModel: string;

  constructor(config: ConfigService) {
    this.apiKey = config.get<string>("OPENROUTER_API_KEY") || undefined;
    this.baseUrl = config.get<string>("OPENROUTER_BASE_URL") || DEFAULT_BASE_URL;
    this.agentModel = config.get<string>("AI_AGENT_MODEL") || DEFAULT_AGENT_MODEL;
    this.visionModel = config.get<string>("AI_VISION_MODEL") || DEFAULT_VISION_MODEL;
    if (!this.apiKey) {
      this.logger.warn("OPENROUTER_API_KEY not set — AI features fall back to their deterministic behaviour.");
    }
  }

  isConfigured(): boolean {
    return this.apiKey !== undefined;
  }

  async chat(request: LlmChatRequest): Promise<LlmChatResult> {
    if (!this.apiKey) {
      throw new Error("OpenRouterChatClient is not configured — check isConfigured() first.");
    }
    const model = request.purpose === "vision" ? this.visionModel : this.agentModel;
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
        "X-Title": "MOTIQ",
      },
      body: JSON.stringify({
        model,
        messages: request.messages,
        ...(request.tools && request.tools.length > 0 ? { tools: request.tools } : {}),
        max_tokens: request.maxTokens ?? DEFAULT_MAX_TOKENS,
        temperature: 0.2,
      }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });

    const raw = await response.text();
    let body: OpenRouterResponse;
    try {
      body = JSON.parse(raw) as OpenRouterResponse;
    } catch {
      throw new Error(`OpenRouter returned a non-JSON response (HTTP ${response.status}).`);
    }
    if (!response.ok || body.error) {
      throw new Error(`OpenRouter error (HTTP ${response.status}, model ${model}): ${body.error?.message ?? raw.slice(0, 200)}`);
    }

    const message = body.choices?.[0]?.message;
    if (!message) {
      throw new Error(`OpenRouter returned no choices (model ${model}).`);
    }
    return {
      content: message.content ?? null,
      toolCalls: message.tool_calls ?? [],
      inputTokens: body.usage?.prompt_tokens ?? 0,
      outputTokens: body.usage?.completion_tokens ?? 0,
    };
  }
}
