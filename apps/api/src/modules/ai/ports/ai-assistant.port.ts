export interface AssistantReplyInput {
  conversationHistory: { role: "USER" | "ASSISTANT"; content: string }[];
  message: string;
}

export interface AssistantReplyResult {
  reply: string;
  inputTokens: number;
  outputTokens: number;
}

/**
 * Ch80/ADR 0007's `AiCapability.assistantReply()`. Deliberately does NOT
 * receive emergency-detection responsibility — ai.service.ts runs
 * detectEmergencyIntent() before ever calling this port, per Ch90's binding
 * "runs before any conversational response" rule. See ADR 0019.
 */
export interface AiAssistantPort {
  isConfigured(): boolean;
  assistantReply(input: AssistantReplyInput): Promise<AssistantReplyResult>;
}

export const AI_ASSISTANT = Symbol("AI_ASSISTANT");
