/** Cleans an API key pasted into a dashboard or .env: surrounding quotes, spaces and line breaks
 * are common and make the provider reject an otherwise valid key. Returns undefined for "no key". */
export function normalizeApiKey(raw: string | undefined | null): string | undefined {
  if (!raw) {
    return undefined;
  }
  const cleaned = raw.replace(/\s+/g, "").replace(/^["']+|["']+$/g, "");
  return cleaned === "" ? undefined : cleaned;
}

/** "a, b ,c" -> ["a","b","c"], dropping blanks. */
export function parseModelList(raw: string | undefined | null): string[] {
  return (raw ?? "")
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry) => entry !== "");
}

/** OpenRouter rejects a "models" list longer than this. */
export const MAX_MODELS_IN_CHAIN = 3;

/** The model to try first, then the fallbacks, without duplicates, capped at OpenRouter's limit.
 * OpenRouter tries them in order when one is rate-limited, down or cannot serve the request. */
export function buildModelChain(primary: string | undefined, fallbacks: string[], defaults: string[]): string[] {
  const chain = primary ? [primary, ...fallbacks] : fallbacks.length > 0 ? fallbacks : defaults;
  return chain.filter((model, index) => chain.indexOf(model) === index).slice(0, MAX_MODELS_IN_CHAIN);
}
