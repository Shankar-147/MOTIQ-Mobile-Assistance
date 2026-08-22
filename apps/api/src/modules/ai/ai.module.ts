import { Module } from "@nestjs/common";
import { AiService } from "./ai.service";
import { AiController } from "./ai.controller";
import { ISSUE_CLASSIFIER } from "./ports/issue-classifier.port";
import { KeywordIssueClassifierAdapter } from "./adapters/keyword-issue-classifier.adapter";
import { PROVIDER_RANKING } from "./ports/provider-ranking.port";
import { WeightedScoreRankingAdapter } from "./adapters/weighted-score-ranking.adapter";
import { AI_ASSISTANT } from "./ports/ai-assistant.port";
import { AnthropicAssistantAdapter } from "./adapters/anthropic-assistant.adapter";
import { KeywordAssistantResponder } from "./adapters/keyword-assistant.responder";

/**
 * Ch80's unifying serving module for the four `AiCapability` methods ADR
 * 0007 names — see ADR 0019 for which of Ch80-91's chapters this phase
 * actually builds versus explicitly defers (Ch81/82/86/87/88/89/91 all
 * presuppose a trained-model lifecycle this bootstrap has no data to run).
 * MatchingModule/RequestModule depend on AiService (exported below), never
 * on a specific adapter directly — same cross-module discipline as every
 * other module boundary (ADR 0001).
 */
@Module({
  controllers: [AiController],
  providers: [
    AiService,
    KeywordAssistantResponder,
    { provide: ISSUE_CLASSIFIER, useClass: KeywordIssueClassifierAdapter },
    { provide: PROVIDER_RANKING, useClass: WeightedScoreRankingAdapter },
    { provide: AI_ASSISTANT, useClass: AnthropicAssistantAdapter },
  ],
  exports: [AiService],
})
export class AiModule {}
