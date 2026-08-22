import { ClassificationResult } from "../issue-classifier.util";

/** Ch80/ADR 0007's `AiCapability.classifyIssueCategory()`. */
export interface IssueClassifierPort {
  classifyIssueCategory(description: string): Promise<ClassificationResult>;
}

export const ISSUE_CLASSIFIER = Symbol("ISSUE_CLASSIFIER");
