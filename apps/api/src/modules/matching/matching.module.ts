import { Module } from "@nestjs/common";
import { ProviderModule } from "../provider/provider.module";
import { RequestModule } from "../request/request.module";
import { MatchingController } from "./matching.controller";
import { MatchingService } from "./matching.service";

/**
 * Owns Assignment and the dispatch decision itself (Ch53). Ranking is
 * expected to go through an AiCapability port with a hard distance-sort
 * fallback (ADR 0007, Ch35, Ch84) — no ranking model exists yet, so the
 * fallback IS the whole implementation for now, not a degraded mode.
 * Depends on Provider (candidate retrieval) and Request (status transitions)
 * only through their exported services, per ADR 0001. Reacts to
 * RequestCreated via an event listener, not a module import — see
 * docs/decisions/0013-*.md.
 */
@Module({
  imports: [ProviderModule, RequestModule],
  controllers: [MatchingController],
  providers: [MatchingService],
  exports: [MatchingService],
})
export class MatchingModule {}
