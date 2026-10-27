import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { LlmChatPort, LlmChatRequest, LlmChatResult, LlmToolCall } from "./llm-chat.port";
import { buildModelChain, normalizeApiKey, parseModelList } from "./openrouter-config.util";

const DEFAULT_BASE_URL = "https://openrouter.ai/api/v1";
// Free models that support BOTH tool calling and image input, tried in this order (OpenRouter's
// "models" fallback routing) when one is rate-limited or down. Free models are rate-limited and
// sometimes slow, so a chain is much more dependable than a single model. Override with
// AI_AGENT_MODEL / AI_VISION_MODEL (first choice) and AI_FALLBACK_MODELS (comma-separated).
const DEFAULT_MODELS = [
  "nvidia/nemotron-3.5-super-vl:free",
  "google/gemma-4-31b-it:free",
  "openrouter/free",
];
const DEFAULT_MAX_TOKENS = 700;
const REQUEST_TIMEOUT_MS = 45_000;
// Free providers are often briefly at capacity (HTTP 429, 5xx, or an error inside a 200). One quick
// retry clears most of those; more would just make the customer wait.
const RETRY_DELAY_MS = 1_200;
const MAX_ATTEMPTS = 2;

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
  private readonly agentModels: string[];
  private readonly visionModels: string[];

  constructor(config: ConfigService) {
    this.apiKey = normalizeApiKey(config.get<string>("OPENROUTER_API_KEY"));
    this.baseUrl = config.get<string>("OPENROUTER_BASE_URL") || DEFAULT_BASE_URL;
    const fallbacks = parseModelList(config.get<string>("AI_FALLBACK_MODELS"));
    this.agentModels = buildModelChain(config.get<string>("AI_AGENT_MODEL")?.trim(), fallbacks.length > 0 ? fallbacks : DEFAULT_MODELS, DEFAULT_MODELS);
    this.visionModels = buildModelChain(config.get<string>("AI_VISION_MODEL")?.trim(), fallbacks.length > 0 ? fallbacks : DEFAULT_MODELS, DEFAULT_MODELS);
    if (!this.apiKey) {
      this.logger.warn("OPENROUTER_API_KEY not set — AI features fall back to their deterministic behaviour.");
    } else {
      // Length only, never the key. A normal OpenRouter key is about 73 characters.
      this.logger.log(`OPENROUTER_API_KEY loaded (${this.apiKey.length} characters); models: ${this.agentModels.join(", ")}`);
      if (!this.apiKey.startsWith("sk-or-")) {
        this.logger.warn("OPENROUTER_API_KEY does not start with 'sk-or-' — check that the whole key was pasted.");
      }
    }
  }

  isConfigured(): boolean {
    return this.apiKey !== undefined;
  }

  async chat(request: LlmChatRequest): Promise<LlmChatResult> {
    if (!this.apiKey) {
      throw new Error("OpenRouterChatClient is not configured — check isConfigured() first.");
    }
    const models = request.purpose === "vision" ? this.visionModels : this.agentModels;
    const payload = JSON.stringify({
      // OpenRouter tries these in order if one is rate-limited, down or cannot serve the request.
      models,
      messages: request.messages,
      ...(request.tools && request.tools.length > 0
        ? { tools: request.tools, provider: { require_parameters: true } }
        : {}),
      max_tokens: request.maxTokens ?? DEFAULT_MAX_TOKENS,
      temperature: 0.2,
    });

    let body: OpenRouterResponse = {};
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
          "X-Title": "MOTIQ",
        },
        body: payload,
        signal: AbortSignal.timeout(request.timeoutMs ?? REQUEST_TIMEOUT_MS),
      });

      const raw = await response.text();
      try {
        body = JSON.parse(raw) as OpenRouterResponse;
      } catch {
        throw new Error(`OpenRouter returned a non-JSON response (HTTP ${response.status}).`);
      }
      if (response.ok && !body.error) {
        break;
      }
      const message = `OpenRouter error (HTTP ${response.status}, models ${models.join(", ")}): ${body.error?.message ?? raw.slice(0, 200)}`;
      // Only brief capacity problems are worth a retry; a bad key, a bad request or an exhausted
      // daily quota will fail the same way again.
      const dailyLimit = /per-day/i.test(message);
      const transient = !dailyLimit && (response.status === 429 || response.status >= 500 || (response.ok && !!body.error));
      if (!transient || attempt === MAX_ATTEMPTS) {
        throw new Error(message);
      }
      this.logger.warn(`${message} — retrying once.`);
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
    }

    const message = body.choices?.[0]?.message;
    if (!message) {
      throw new Error(`OpenRouter returned no choices (models ${models.join(", ")}).`);
    }
    return {
      content: message.content ?? null,
      toolCalls: message.tool_calls ?? [],
      inputTokens: body.usage?.prompt_tokens ?? 0,
      outputTokens: body.usage?.completion_tokens ?? 0,
    };
  }
}
