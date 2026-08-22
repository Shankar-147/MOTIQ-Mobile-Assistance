import { Injectable } from "@nestjs/common";
import { IssueClassifierPort } from "../ports/issue-classifier.port";
import { ClassificationResult, classifyIssueDescription } from "../issue-classifier.util";

/**
 * The only IssueClassifierPort implementation in this bootstrap phase — see
 * issue-classifier.util.ts's doc comment for why this is a keyword matcher,
 * not a trained model. Kept as a thin adapter (rather than calling the util
 * directly from AiService) so a real trained classifier can be swapped in
 * later purely via ai.module.ts's DI binding.
 */
@Injectable()
export class KeywordIssueClassifierAdapter implements IssueClassifierPort {
  async classifyIssueCategory(description: string): Promise<ClassificationResult> {
    return classifyIssueDescription(description);
  }
}
