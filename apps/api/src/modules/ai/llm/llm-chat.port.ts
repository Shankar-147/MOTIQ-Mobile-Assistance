export type LlmContentPart =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } };

export interface LlmToolCall {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
}

export interface LlmMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string | LlmContentPart[] | null;
  tool_calls?: LlmToolCall[];
  tool_call_id?: string;
}

export interface LlmToolSchema {
  type: "function";
  function: { name: string; description: string; parameters: Record<string, unknown> };
}

export interface LlmChatRequest {
  messages: LlmMessage[];
  tools?: LlmToolSchema[];
  /** Which configured model to use: the tool-calling agent model or the vision model. */
  purpose: "agent" | "vision";
  maxTokens?: number;
  /** Milliseconds before the call is abandoned (default 45 s); callers with a fast fallback use less. */
  timeoutMs?: number;
}

export interface LlmChatResult {
  content: string | null;
  toolCalls: LlmToolCall[];
  inputTokens: number;
  outputTokens: number;
}

/**
 * A provider-neutral chat-completion port (OpenAI-style messages and tool calls) shared by the
 * agent, the free-text issue classifier and photo diagnosis. Every caller treats it as optional:
 * when `isConfigured()` is false or a call throws, the deterministic fallback runs instead
 * (ADR 0007 — AI is additive, never load-bearing).
 */
export interface LlmChatPort {
  isConfigured(): boolean;
  chat(request: LlmChatRequest): Promise<LlmChatResult>;
}

export const LLM_CHAT = Symbol("LLM_CHAT");
