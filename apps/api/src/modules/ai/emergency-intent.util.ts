/**
 * Ch90's binding, non-negotiable rule: "Emergency-intent detection is
 * mandatory and runs before any conversational response — if detected, the
 * chatbot must redirect to the SOS path (Ch55), never attempt to 'handle' an
 * emergency conversationally." This is a pure, deterministic pre-filter —
 * never itself AI/LLM-based, since the one thing this check must never do is
 * fail open because a model call was slow, errored, or hallucinated a benign
 * reading. See ai.service.ts's doc comment for why this can't fully satisfy
 * Ch90 yet (Ch55, the actual SOS path, doesn't exist), and ADR 0019.
 */
const EMERGENCY_KEYWORDS = [
  "accident",
  "crash",
  "crashed",
  "collision",
  "fire",
  "burning",
  "explosion",
  "bleeding",
  "injured",
  "injury",
  "unconscious",
  "trapped",
  "can't breathe",
  "cant breathe",
  "chest pain",
  "attacked",
  "assault",
  "robbed",
  "gun",
  "weapon",
  "help me now",
  "emergency",
  "dying",
];

export function detectEmergencyIntent(message: string): boolean {
  const normalized = message.toLowerCase();
  return EMERGENCY_KEYWORDS.some((keyword) => normalized.includes(keyword));
}
