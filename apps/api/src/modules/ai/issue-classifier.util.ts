import { IssueType } from "@motiq/types";

export interface ClassificationResult {
  issueType: IssueType;
  /** 0-1. Below CLASSIFICATION_CONFIDENCE_THRESHOLD, callers should treat
   * this as a suggestion only — Ch83's "confidence-threshold fallback to
   * manual category selection." */
  confidence: number;
}

export const CLASSIFICATION_CONFIDENCE_THRESHOLD = 0.5;

/**
 * Ch83's stand-in for a trained Naive Bayes classifier: keyword matching
 * against Ch2's exact issue taxonomy, not a trained model — this bootstrap
 * has no labeled historical request-description data to train one against
 * (see ADR 0019). Never gates request creation on its own: the customer
 * always picks `issueType` explicitly (CreateServiceRequestDto), this only
 * powers an optional "did you mean X?" suggestion.
 */
const KEYWORDS: Record<Exclude<IssueType, IssueType.OTHER>, string[]> = {
  [IssueType.TOW]: ["tow", "towing", "accident", "crashed", "won't start", "wont start", "stuck"],
  [IssueType.REPAIR]: ["repair", "broken", "engine", "noise", "smoke", "leak", "overheating", "overheat"],
  [IssueType.FUEL]: ["fuel", "petrol", "diesel", "gas", "empty tank", "out of fuel", "ran out"],
  [IssueType.FLAT_TYRE]: ["flat", "tyre", "tire", "puncture", "punctured"],
  [IssueType.BATTERY_JUMP]: ["battery", "jump start", "jumpstart", "won't turn on", "dead battery"],
};

export function classifyIssueDescription(description: string): ClassificationResult {
  const normalized = description.toLowerCase();

  let bestMatch: { issueType: IssueType; matchedKeywords: number } = {
    issueType: IssueType.OTHER,
    matchedKeywords: 0,
  };

  for (const [issueType, keywords] of Object.entries(KEYWORDS) as [IssueType, string[]][]) {
    const matchedKeywords = keywords.filter((keyword) => normalized.includes(keyword)).length;
    if (matchedKeywords > bestMatch.matchedKeywords) {
      bestMatch = { issueType, matchedKeywords };
    }
  }

  if (bestMatch.matchedKeywords === 0) {
    return { issueType: IssueType.OTHER, confidence: 0 };
  }

  // More matched keywords -> higher confidence, capped at 0.95 (a keyword
  // matcher should never claim near-certainty the way a real trained
  // model's calibrated probability might).
  const confidence = Math.min(0.5 + bestMatch.matchedKeywords * 0.15, 0.95);
  return { issueType: bestMatch.issueType, confidence };
}
