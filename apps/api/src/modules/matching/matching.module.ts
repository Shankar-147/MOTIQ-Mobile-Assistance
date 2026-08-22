import { Module } from "@nestjs/common";
import { ProviderModule } from "../provider/provider.module";
import { RequestModule } from "../request/request.module";
import { MatchingService } from "./matching.service";

/**
 * Owns Assignment and the dispatch decision itself (Ch53). Ranking is
 * expected to go through an AiCapability port with a hard distance-sort
 * fallback (ADR 0007, Ch35, Ch84) — not implemented in this bootstrap phase.
 * Depends on Provider (candidate retrieval) and Request (status transitions)
 * only through their exported services, per ADR 0001.
 */
@Module({
  imports: [ProviderModule, RequestModule],
  providers: [MatchingService],
  exports: [MatchingService],
})
export class MatchingModule {}
