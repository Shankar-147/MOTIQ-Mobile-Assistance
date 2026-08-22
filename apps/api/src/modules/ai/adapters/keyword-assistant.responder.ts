import { Injectable } from "@nestjs/common";
import { AssistantReplyResult } from "../ports/ai-assistant.port";

/**
 * Ch90's "grounding/RAG against MOTIQ's own policy content only" — this
 * bootstrap has no real document corpus or vector store to run RAG against,
 * so grounding here means literally: only ever answer from this small,
 * hardcoded FAQ set, never from open-ended generation. This is the always-
 * available fallback used when AnthropicAssistantAdapter is unconfigured or
 * errors (Ch35's resilience pattern) — not swapped via DI like the other AI
 * ports, since it IS the designed-default fallback (ADR 0007), always
 * injected directly by AiService rather than behind AI_ASSISTANT.
 */
const FAQ_ENTRIES: { keywords: string[]; answer: string }[] = [
  {
    keywords: ["cancel"],
    answer:
      "You can cancel an active request from the tracking screen. Cancellations before a provider accepts are free; check your City's terms for cancellations after acceptance.",
  },
  {
    keywords: ["payment", "pay", "charge", "refund"],
    answer:
      "Payment is settled automatically once your job is marked complete. If something looks wrong with a charge, use the 'Contact support' option so a human can look into it.",
  },
  {
    keywords: ["eta", "arrive", "arriving", "how long", "when"],
    answer:
      "You'll see your provider's live location and an estimated arrival window on the tracking screen once they're assigned — it's always shown as a range, not an exact minute, since traffic conditions vary.",
  },
  {
    keywords: ["provider", "verified", "trust", "safe"],
    answer:
      "Every MOTIQ provider goes through a verification process before they can accept jobs, and our trust score weighs both their rating history and verification tier.",
  },
];

const DEFAULT_ANSWER =
  "I can help with common questions about requests, payments, tracking, and provider verification. For anything else, please use 'Contact support' to reach a human agent.";

@Injectable()
export class KeywordAssistantResponder {
  reply(message: string): AssistantReplyResult {
    const normalized = message.toLowerCase();
    const match = FAQ_ENTRIES.find((entry) => entry.keywords.some((keyword) => normalized.includes(keyword)));
    return {
      reply: match?.answer ?? DEFAULT_ANSWER,
      inputTokens: 0,
      outputTokens: 0,
    };
  }
}
