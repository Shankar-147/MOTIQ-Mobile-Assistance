import { IssueType } from "@motiq/types";
import { classifyIssueDescription, CLASSIFICATION_CONFIDENCE_THRESHOLD } from "./issue-classifier.util";

describe("classifyIssueDescription", () => {
  it("classifies an unambiguous flat-tyre description with confidence above threshold", () => {
    const result = classifyIssueDescription("I have a flat tyre on the highway");
    expect(result.issueType).toBe(IssueType.FLAT_TYRE);
    expect(result.confidence).toBeGreaterThanOrEqual(CLASSIFICATION_CONFIDENCE_THRESHOLD);
  });

  it("classifies a battery description", () => {
    const result = classifyIssueDescription("My car battery is dead, need a jump start");
    expect(result.issueType).toBe(IssueType.BATTERY_JUMP);
  });

  it("falls back to OTHER with zero confidence when nothing matches", () => {
    const result = classifyIssueDescription("something is wrong but I don't know what");
    expect(result.issueType).toBe(IssueType.OTHER);
    expect(result.confidence).toBe(0);
  });

  it("is case-insensitive", () => {
    const result = classifyIssueDescription("OUT OF FUEL on the highway");
    expect(result.issueType).toBe(IssueType.FUEL);
  });

  it("never returns a confidence above 0.95", () => {
    const result = classifyIssueDescription(
      "flat tyre puncture tire punctured on the highway, flat flat flat",
    );
    expect(result.confidence).toBeLessThanOrEqual(0.95);
  });

  it("picks the category with the most matched keywords when a description mentions several", () => {
    const result = classifyIssueDescription("flat tyre and also a small leak");
    expect(result.issueType).toBe(IssueType.FLAT_TYRE);
  });
});
