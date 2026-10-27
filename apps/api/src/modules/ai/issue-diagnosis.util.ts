import { IssueType } from "@motiq/types";

export type Urgency = "LOW" | "MEDIUM" | "HIGH";

export interface Diagnosis {
  issueType: IssueType;
  /** 0-1 — below CLASSIFICATION_CONFIDENCE_THRESHOLD the app treats it as a suggestion only. */
  confidence: number;
  urgency: Urgency;
  summary: string;
  advice: string;
}

const ISSUE_TAXONOMY = `Issue types (pick exactly one):
- TOW: the vehicle cannot be driven and needs towing (accident damage, will not start and cannot be fixed on the spot, stuck).
- REPAIR: a mechanical or electrical fault a mechanic could fix on site (strange noise, smoke, leak, overheating, warning light).
- FUEL: out of fuel or wrong fuel.
- FLAT_TYRE: puncture, flat or damaged tyre.
- BATTERY_JUMP: dead or weak battery, needs a jump start.
- OTHER: anything else, or unclear.`;

const OUTPUT_FORMAT = `Reply with ONLY a JSON object, no other text:
{"issueType":"TOW|REPAIR|FUEL|FLAT_TYRE|BATTERY_JUMP|OTHER","confidence":0.0-1.0,"urgency":"LOW|MEDIUM|HIGH","summary":"one short sentence in English","advice":"one short safety tip in English"}
Rules: urgency is HIGH only when someone's safety is at risk (highway, night, smoke or fire, injury). The advice is a safety tip for waiting for help (hazard lights, safe spot) and NEVER repair instructions. If unsure, use OTHER with low confidence.`;

export const CLASSIFY_SYSTEM_PROMPT = `You triage roadside-assistance requests for an app in India. The customer may write in English, Hindi, Tamil or a mix.
${ISSUE_TAXONOMY}
${OUTPUT_FORMAT}`;

export const PHOTO_SYSTEM_PROMPT = `You look at a photo a driver took of their vehicle problem (a tyre, a dashboard warning light, damage, an engine bay, a battery) and triage it for a roadside-assistance app in India. Describe only what is visible; if the photo does not show a vehicle problem, answer OTHER with low confidence.
${ISSUE_TAXONOMY}
${OUTPUT_FORMAT}`;

const VALID_ISSUE_TYPES = new Set<string>(Object.values(IssueType));
const VALID_URGENCIES = new Set<string>(["LOW", "MEDIUM", "HIGH"]);

function extractJsonObject(text: string): string | null {
  const stripped = text.replace(/```(?:json)?/gi, "");
  const start = stripped.indexOf("{");
  const end = stripped.lastIndexOf("}");
  if (start < 0 || end <= start) {
    return null;
  }
  return stripped.slice(start, end + 1);
}

/** Parses a model's triage reply defensively — returns null (so the caller falls back to the
 * deterministic classifier) for anything that is not a valid diagnosis. */
export function parseDiagnosis(text: string | null | undefined): Diagnosis | null {
  if (!text) {
    return null;
  }
  const json = extractJsonObject(text);
  if (!json) {
    return null;
  }
  let raw: Record<string, unknown>;
  try {
    raw = JSON.parse(json) as Record<string, unknown>;
  } catch {
    return null;
  }

  const issueType = typeof raw.issueType === "string" ? raw.issueType.toUpperCase() : "";
  if (!VALID_ISSUE_TYPES.has(issueType)) {
    return null;
  }

  const confidenceRaw = typeof raw.confidence === "number" ? raw.confidence : Number(raw.confidence);
  const confidence = Number.isFinite(confidenceRaw) ? Math.min(Math.max(confidenceRaw, 0), 0.99) : 0.5;

  const urgencyRaw = typeof raw.urgency === "string" ? raw.urgency.toUpperCase() : "";
  const urgency = (VALID_URGENCIES.has(urgencyRaw) ? urgencyRaw : "MEDIUM") as Urgency;

  const clean = (value: unknown, max: number) =>
    typeof value === "string" ? value.replace(/\s+/g, " ").trim().slice(0, max) : "";

  return {
    issueType: issueType as IssueType,
    confidence,
    urgency,
    summary: clean(raw.summary, 200),
    advice: clean(raw.advice, 300),
  };
}
