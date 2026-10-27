import { IssueType } from "@motiq/types";
import { parseDiagnosis } from "./issue-diagnosis.util";

describe("parseDiagnosis", () => {
  it("parses a clean JSON reply", () => {
    const result = parseDiagnosis(
      '{"issueType":"FLAT_TYRE","confidence":0.9,"urgency":"MEDIUM","summary":"Rear tyre is flat.","advice":"Turn on hazard lights."}',
    );
    expect(result).toEqual({
      issueType: IssueType.FLAT_TYRE,
      confidence: 0.9,
      urgency: "MEDIUM",
      summary: "Rear tyre is flat.",
      advice: "Turn on hazard lights.",
    });
  });

  it("tolerates a markdown fence and surrounding text", () => {
    const result = parseDiagnosis('Sure!\n```json\n{"issueType":"battery_jump","confidence":0.7,"urgency":"low"}\n```');
    expect(result?.issueType).toBe(IssueType.BATTERY_JUMP);
    expect(result?.urgency).toBe("LOW");
  });

  it("clamps confidence and defaults a bad urgency", () => {
    const result = parseDiagnosis('{"issueType":"TOW","confidence":7,"urgency":"EXTREME"}');
    expect(result?.confidence).toBeLessThan(1);
    expect(result?.urgency).toBe("MEDIUM");
  });

  it("returns null for an unknown issue type, non-JSON or empty input", () => {
    expect(parseDiagnosis('{"issueType":"ENGINE_SWAP"}')).toBeNull();
    expect(parseDiagnosis("I think it is a flat tyre")).toBeNull();
    expect(parseDiagnosis("{not json}")).toBeNull();
    expect(parseDiagnosis(null)).toBeNull();
  });
});
