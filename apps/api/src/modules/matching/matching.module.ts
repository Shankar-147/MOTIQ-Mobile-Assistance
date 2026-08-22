import { Module } from "@nestjs/common";
import { ProviderModule } from "../provider/provider.module";
import { RequestModule } from "../request/request.module";
import { AiModule } from "../ai/ai.module";
import { MatchingController } from "./matching.controller";
import { MatchingService } from "./matching.service";

/**
 * Owns Assignment and the dispatch decision itself (Ch53). Ranking goes
 * through AiService.rankProviders() (Ch84, Phase 6) with a hard distance-sort
 * fallback (ADR 0007, Ch35) if ranking throws — see dispatch()'s try/catch.
 * Depends on Provider (candidate retrieval), Request (status transitions),
 * and Ai (ranking) only through their exported services, per ADR 0001.
 * Reacts to RequestCreated via an event listener, not a module import — see
 * docs/decisions/0013-*.md.
 */
@Module({
  imports: [ProviderModule, RequestModule, AiModule],
  controllers: [MatchingController],
  providers: [MatchingService],
  exports: [MatchingService],
})
export class MatchingModule {}
